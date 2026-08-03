import { useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarDays,
  Download,
  Edit3,
  FileText,
  MessageSquare,
  Paperclip,
  Send,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { EmptyState, ErrorState, PageLoader } from '../../components/common/AsyncState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Avatar, Badge, Button, Card, FieldError, PageHeader } from '../../components/common/ui';
import { useAuth } from '../../features/auth/auth-context';
import {
  downloadAttachmentFile,
  getApiError,
  request,
  requestPaginated,
  requestResource,
} from '../../lib/api';
import {
  canManageProject,
  displayUser,
  entityId,
  formatBytes,
  formatDate,
  formatDateTime,
  priorityLabels,
  taskStatusLabels,
  validTaskTransitions,
} from '../../lib/utils';
import type { Attachment, Comment, Project, Task, TaskStatus } from '../../types/api';

const commentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Comment cannot be empty.')
    .max(2000, 'Comment must be 2,000 characters or fewer.'),
});
type CommentValues = z.infer<typeof commentSchema>;
type DeleteTarget =
  | { type: 'task'; id: string; label: string }
  | { type: 'comment'; id: string; label: string }
  | { type: 'attachment'; id: string; label: string };

const maxUploadBytes = Number(import.meta.env.VITE_MAX_UPLOAD_BYTES ?? 5_242_880);
const allowedExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'txt', 'doc', 'docx'];

export function TaskDetailsPage() {
  const { taskId = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const task = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => requestResource<Task>({ url: `/tasks/${taskId}` }, 'task'),
  });
  const projectId = entityId(task.data?.projectId);
  const project = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => requestResource<Project>({ url: `/projects/${projectId}` }, 'project'),
    enabled: Boolean(projectId),
  });
  const comments = useQuery({
    queryKey: ['task', taskId, 'comments'],
    queryFn: () =>
      requestPaginated<Comment>({
        url: `/tasks/${taskId}/comments`,
        params: { page: 1, limit: 100 },
      }),
  });
  const attachments = useQuery({
    queryKey: ['task', taskId, 'attachments'],
    queryFn: () => request<Attachment[]>({ url: `/tasks/${taskId}/attachments` }),
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommentValues>({ resolver: zodResolver(commentSchema), defaultValues: { body: '' } });

  const canManage = Boolean(user && project.data && canManageProject(user, project.data));
  const canUpdateStatus = Boolean(
    user && task.data && (canManage || entityId(task.data.assigneeId) === user.id),
  );
  const projectMembers = useMemo(
    () =>
      project.data?.members ??
      project.data?.memberIds.filter(
        (member): member is Exclude<typeof member, string> => typeof member !== 'string',
      ) ??
      [],
    [project.data?.memberIds, project.data?.members],
  );
  const members = useMemo(
    () => projectMembers.filter((member) => member.isActive),
    [projectMembers],
  );
  const currentAssigneeId = entityId(task.data?.assigneeId);
  const inactiveAssignee = projectMembers.find(
    (member) => member.id === currentAssigneeId && !member.isActive,
  );
  const assigneeName =
    projectMembers.find((member) => member.id === currentAssigneeId)?.name ??
    displayUser(task.data?.assigneeId);

  const invalidateTask = () => {
    void queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    void queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
    void queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };
  const changeStatus = useMutation({
    mutationFn: (status: TaskStatus) =>
      requestResource<Task>(
        { method: 'PATCH', url: `/tasks/${taskId}/status`, data: { status } },
        'task',
      ),
    onSuccess: () => {
      toast.success('Task status updated.');
      invalidateTask();
    },
    onError: (error) => toast.error(getApiError(error, 'Unable to update the status.')),
  });
  const assign = useMutation({
    mutationFn: (assigneeId: string) =>
      requestResource<Task>(
        {
          method: 'PATCH',
          url: `/tasks/${taskId}/assignee`,
          data: { assigneeId: assigneeId || null },
        },
        'task',
      ),
    onSuccess: () => {
      toast.success('Task assignment updated.');
      invalidateTask();
    },
    onError: (error) => toast.error(getApiError(error, 'Unable to update the assignee.')),
  });
  const addComment = useMutation({
    mutationFn: (values: CommentValues) =>
      requestResource<Comment>(
        { method: 'POST', url: `/tasks/${taskId}/comments`, data: values },
        'comment',
      ),
    onSuccess: () => {
      reset();
      toast.success('Comment added.');
      void queryClient.invalidateQueries({ queryKey: ['task', taskId, 'comments'] });
    },
    onError: (error) => toast.error(getApiError(error, 'Unable to add the comment.')),
  });
  const editComment = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      requestResource<Comment>(
        { method: 'PATCH', url: `/comments/${id}`, data: { body } },
        'comment',
      ),
    onSuccess: () => {
      setEditingCommentId(null);
      setEditingBody('');
      toast.success('Comment updated.');
      void queryClient.invalidateQueries({ queryKey: ['task', taskId, 'comments'] });
    },
    onError: (error) => toast.error(getApiError(error, 'Unable to update the comment.')),
  });
  const upload = useMutation({
    mutationFn: (file: File) => {
      const data = new FormData();
      data.append('file', file);
      return requestResource<Attachment>(
        {
          method: 'POST',
          url: `/tasks/${taskId}/attachments`,
          data,
          headers: { 'Content-Type': 'multipart/form-data' },
        },
        'attachment',
      );
    },
    onSuccess: () => {
      if (fileRef.current) fileRef.current.value = '';
      toast.success('Attachment uploaded.');
      void queryClient.invalidateQueries({ queryKey: ['task', taskId, 'attachments'] });
    },
    onError: (error) => toast.error(getApiError(error, 'Unable to upload this file.')),
  });
  const downloadFile = useMutation({
    mutationFn: downloadAttachmentFile,
    onError: (error) => toast.error(getApiError(error, 'Unable to download this file.')),
  });

  const deleteMutation = useMutation({
    mutationFn: async (target: DeleteTarget) => {
      if (target.type === 'task')
        return request<null>({ method: 'DELETE', url: `/tasks/${target.id}` });
      if (target.type === 'comment')
        return request<null>({ method: 'DELETE', url: `/comments/${target.id}` });
      return request<null>({ method: 'DELETE', url: `/attachments/${target.id}` });
    },
    onSuccess: (_, target) => {
      setDeleteTarget(null);
      if (target.type === 'task') {
        toast.success('Task deleted.');
        queryClient.removeQueries({ queryKey: ['task', taskId] });
        void queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
        void queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
        void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        navigate(`/projects/${projectId}/tasks`);
        return;
      }
      toast.success(target.type === 'comment' ? 'Comment deleted.' : 'Attachment deleted.');
      void queryClient.invalidateQueries({
        queryKey: ['task', taskId, target.type === 'comment' ? 'comments' : 'attachments'],
      });
    },
    onError: (error) => toast.error(getApiError(error, 'Unable to delete this item.')),
  });

  const selectFile = (file?: File) => {
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!allowedExtensions.includes(extension)) {
      toast.error('This file type is not supported.');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    if (file.size > maxUploadBytes) {
      toast.error(`Attachment exceeds the allowed file size of ${formatBytes(maxUploadBytes)}.`);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    upload.mutate(file);
  };

  if (task.isPending || (projectId && project.isPending))
    return <PageLoader label="Loading task" />;
  if (task.isError || !task.data)
    return (
      <ErrorState
        message={getApiError(task.error, 'Task is unavailable.')}
        onRetry={() => void task.refetch()}
      />
    );
  const item = task.data;

  return (
    <div>
      <PageHeader
        eyebrow={project.data?.name ?? 'Task details'}
        title={item.title}
        description={item.description}
        actions={
          <>
            <Link to={projectId ? `/projects/${projectId}/tasks` : '/tasks/my'}>
              <Button variant="secondary">
                <ArrowLeft className="h-4 w-4" /> Tasks
              </Button>
            </Link>
            {canManage ? (
              <Link to={`/tasks/${taskId}/edit`}>
                <Button variant="secondary">
                  <Edit3 className="h-4 w-4" /> Edit
                </Button>
              </Link>
            ) : null}
            {canManage ? (
              <Button
                variant="danger"
                onClick={() => setDeleteTarget({ type: 'task', id: item.id, label: item.title })}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            ) : null}
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Status</p>
          {canUpdateStatus ? (
            <select
              aria-label="Task status"
              className="field mt-3"
              value={item.status}
              disabled={changeStatus.isPending}
              onChange={(event) => changeStatus.mutate(event.target.value as TaskStatus)}
            >
              {validTaskTransitions[item.status].map((value) => (
                <option value={value} key={value}>
                  {taskStatusLabels[value]}
                </option>
              ))}
            </select>
          ) : (
            <div className="mt-3">
              <Badge kind={item.status}>{taskStatusLabels[item.status]}</Badge>
            </div>
          )}
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Priority</p>
          <div className="mt-3">
            <Badge kind={item.priority}>{priorityLabels[item.priority]}</Badge>
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Due date</p>
          <p
            className={`mt-3 flex items-center gap-2 text-sm font-semibold ${new Date(item.dueDate) < new Date() && item.status !== 'COMPLETED' ? 'text-red-600' : 'text-ink'}`}
          >
            <CalendarDays className="h-4 w-4" />
            {formatDate(item.dueDate)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Assignee</p>
          {canManage ? (
            <select
              aria-label="Task assignee"
              className="field mt-3"
              value={entityId(item.assigneeId)}
              disabled={assign.isPending}
              onChange={(event) => assign.mutate(event.target.value)}
            >
              <option value="">Unassigned</option>
              {inactiveAssignee ? (
                <option value={inactiveAssignee.id} disabled>
                  {inactiveAssignee.name} · inactive
                </option>
              ) : null}
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="mt-3 flex items-center gap-2 truncate text-sm font-semibold text-ink">
              <UserRound className="h-4 w-4 text-accent" />
              {assigneeName}
            </p>
          )}
        </Card>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <h2 className="flex items-center gap-2 font-bold text-ink">
              <MessageSquare className="h-4 w-4 text-accent" /> Discussion
            </h2>
            <p className="mt-1 text-xs text-slate-500">Keep decisions and task context together.</p>
          </div>
          <form
            className="border-b border-slate-200 p-5 sm:p-6"
            onSubmit={handleSubmit((values) => addComment.mutate(values))}
          >
            <label htmlFor="new-comment" className="field-label">
              Add a comment
            </label>
            <textarea
              id="new-comment"
              className="field-area min-h-24"
              placeholder="Share an update or ask a question…"
              aria-invalid={Boolean(errors.body)}
              {...register('body')}
            />
            <FieldError message={errors.body?.message} />
            <div className="mt-3 flex justify-end">
              <Button type="submit" loading={addComment.isPending}>
                <Send className="h-4 w-4" /> Comment
              </Button>
            </div>
          </form>
          <div className="divide-y divide-slate-100">
            {comments.isPending ? (
              <p className="p-8 text-center text-sm text-slate-500">Loading comments…</p>
            ) : comments.isError ? (
              <p className="p-8 text-center text-sm text-red-600">{getApiError(comments.error)}</p>
            ) : comments.data.items.length ? (
              comments.data.items.map((comment) => {
                const author = typeof comment.authorId === 'string' ? null : comment.authorId;
                const own = entityId(comment.authorId) === user?.id;
                const mayDelete = own || user?.role === 'ADMIN' || canManage;
                return (
                  <article key={comment.id} className="p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                      <Avatar
                        name={author?.name ?? (own ? (user?.name ?? 'You') : 'Team member')}
                        imageUrl={author?.avatarUrl}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-ink">
                              {author?.name ?? (own ? 'You' : 'Team member')}
                            </p>
                            <p className="text-xs text-slate-400">
                              {formatDateTime(comment.createdAt)}
                              {comment.updatedAt !== comment.createdAt ? ' · edited' : ''}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {own ? (
                              <button
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-accent"
                                aria-label="Edit comment"
                                onClick={() => {
                                  setEditingCommentId(comment.id);
                                  setEditingBody(comment.body);
                                }}
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                            ) : null}
                            {mayDelete ? (
                              <button
                                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                aria-label="Delete comment"
                                onClick={() =>
                                  setDeleteTarget({
                                    type: 'comment',
                                    id: comment.id,
                                    label: 'this comment',
                                  })
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : null}
                          </div>
                        </div>
                        {editingCommentId === comment.id ? (
                          <div className="mt-3">
                            <textarea
                              className="field-area min-h-20"
                              value={editingBody}
                              onChange={(event) => setEditingBody(event.target.value)}
                              aria-label="Edit comment body"
                            />
                            <div className="mt-2 flex justify-end gap-2">
                              <Button variant="ghost" onClick={() => setEditingCommentId(null)}>
                                Cancel
                              </Button>
                              <Button
                                loading={editComment.isPending}
                                disabled={!editingBody.trim()}
                                onClick={() =>
                                  editComment.mutate({ id: comment.id, body: editingBody.trim() })
                                }
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                            {comment.body}
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="p-6">
                <EmptyState
                  title="No comments yet"
                  description="Start the discussion with a helpful update."
                />
              </div>
            )}
          </div>
        </Card>

        <Card className="h-fit overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <h2 className="flex items-center gap-2 font-bold text-ink">
              <Paperclip className="h-4 w-4 text-accent" /> Attachments
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              PDF, images, text and Office documents up to {formatBytes(maxUploadBytes)}.
            </p>
          </div>
          <div className="p-5 sm:p-6">
            <label className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-slate-200 px-4 py-7 text-center transition hover:border-blue-300 hover:bg-blue-50/40">
              <Upload className="h-6 w-6 text-accent" />
              <span className="mt-2 text-sm font-semibold text-slate-700">
                {upload.isPending ? 'Uploading…' : 'Choose a file to upload'}
              </span>
              <span className="mt-1 text-xs text-slate-400">Executables are never accepted</span>
              <input
                ref={fileRef}
                type="file"
                className="sr-only"
                accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx"
                disabled={upload.isPending}
                onChange={(event) => selectFile(event.target.files?.[0])}
              />
            </label>
          </div>
          <div className="divide-y divide-slate-100 border-t border-slate-100">
            {attachments.isPending ? (
              <p className="p-6 text-center text-sm text-slate-500">Loading files…</p>
            ) : attachments.isError ? (
              <p className="p-6 text-center text-sm text-red-600">
                {getApiError(attachments.error)}
              </p>
            ) : attachments.data.length ? (
              attachments.data.map((file) => {
                const own = entityId(file.uploadedBy) === user?.id;
                const mayDelete = own || user?.role === 'ADMIN' || canManage;
                return (
                  <div key={file.id} className="flex items-center gap-3 px-5 py-4 sm:px-6">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-accent">
                      <FileText className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <button
                        className="block max-w-full truncate text-left text-sm font-semibold text-slate-700 hover:text-accent"
                        onClick={() => downloadFile.mutate(file)}
                      >
                        {file.originalName}
                      </button>
                      <span className="mt-0.5 block text-xs text-slate-400">
                        {formatBytes(file.size)} · {formatDate(file.createdAt)}
                      </span>
                    </span>
                    <button
                      className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-accent disabled:opacity-50"
                      onClick={() => downloadFile.mutate(file)}
                      disabled={downloadFile.isPending}
                      aria-label={`Download ${file.originalName}`}
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    {mayDelete ? (
                      <button
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        onClick={() =>
                          setDeleteTarget({
                            type: 'attachment',
                            id: file.id,
                            label: file.originalName,
                          })
                        }
                        aria-label={`Delete ${file.originalName}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <p className="p-8 text-center text-sm text-slate-500">No files attached.</p>
            )}
          </div>
        </Card>
      </section>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.type ?? 'item'}?`}
        description={
          deleteTarget?.type === 'task'
            ? `“${deleteTarget.label}” will be permanently removed.`
            : `“${deleteTarget?.label ?? 'This item'}” will be permanently removed from the task.`
        }
        confirmLabel={`Delete ${deleteTarget?.type ?? 'item'}`}
        busy={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
      />
    </div>
  );
}
