import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { ErrorState, PageLoader } from '../../components/common/AsyncState';
import { Button, Card, FieldError, PageHeader, RequiredMark } from '../../components/common/ui';
import { getApiError, requestResource } from '../../lib/api';
import {
  dateInputValue,
  entityId,
  priorityLabels,
  taskStatusLabels,
  validTaskTransitions,
} from '../../lib/utils';
import type { Project, Task } from '../../types/api';

const taskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required.')
    .max(160, 'Title must be 160 characters or fewer.'),
  description: z
    .string()
    .trim()
    .min(1, 'Description is required.')
    .max(3000, 'Description must be 3,000 characters or fewer.'),
  status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  assigneeId: z.string(),
  dueDate: z.string().min(1, 'Task due date is required.'),
});
type TaskValues = z.infer<typeof taskSchema>;

export function TaskFormPage() {
  const { projectId: routeProjectId, taskId } = useParams();
  const isEditing = Boolean(taskId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const task = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => requestResource<Task>({ url: `/tasks/${taskId}` }, 'task'),
    enabled: isEditing,
  });
  const effectiveProjectId = routeProjectId ?? entityId(task.data?.projectId);
  const project = useQuery({
    queryKey: ['project', effectiveProjectId],
    queryFn: () => requestResource<Project>({ url: `/projects/${effectiveProjectId}` }, 'project'),
    enabled: Boolean(effectiveProjectId),
  });
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TaskValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'TODO',
      priority: 'MEDIUM',
      assigneeId: '',
      dueDate: '',
    },
  });

  useEffect(() => {
    if (task.data)
      reset({
        title: task.data.title,
        description: task.data.description,
        status: task.data.status,
        priority: task.data.priority,
        assigneeId: entityId(task.data.assigneeId),
        dueDate: dateInputValue(task.data.dueDate),
      });
  }, [reset, task.data]);

  const mutation = useMutation({
    mutationFn: async (values: TaskValues) => {
      if (!effectiveProjectId) throw new Error('Project is unavailable.');
      if (!isEditing)
        return requestResource<Task>(
          {
            method: 'POST',
            url: `/projects/${effectiveProjectId}/tasks`,
            data: { ...values, assigneeId: values.assigneeId || undefined },
          },
          'task',
        );
      let updated = await requestResource<Task>(
        {
          method: 'PATCH',
          url: `/tasks/${taskId}`,
          data: {
            title: values.title,
            description: values.description,
            priority: values.priority,
            dueDate: values.dueDate,
          },
        },
        'task',
      );
      if (values.status !== task.data?.status)
        updated = await requestResource<Task>(
          { method: 'PATCH', url: `/tasks/${taskId}/status`, data: { status: values.status } },
          'task',
        );
      if (values.assigneeId !== entityId(task.data?.assigneeId))
        updated = await requestResource<Task>(
          {
            method: 'PATCH',
            url: `/tasks/${taskId}/assignee`,
            data: { assigneeId: values.assigneeId || null },
          },
          'task',
        );
      return updated;
    },
    onSuccess: (saved) => {
      toast.success(isEditing ? 'Task updated.' : 'Task created.');
      queryClient.setQueryData(['task', saved.id], saved);
      void queryClient.invalidateQueries({ queryKey: ['task', saved.id] });
      void queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate(`/tasks/${saved.id}`);
    },
    onError: (error) =>
      toast.error(getApiError(error, `Unable to ${isEditing ? 'update' : 'create'} the task.`)),
  });

  if (isEditing && task.isPending) return <PageLoader label="Loading task form" />;
  if (isEditing && task.isError)
    return <ErrorState message={getApiError(task.error, 'Task is unavailable.')} />;
  if (project.isPending) return <PageLoader label="Loading task form" />;
  if (project.isError || !project.data)
    return <ErrorState message={getApiError(project.error, 'Task form is unavailable.')} />;
  const allMembers =
    project.data.members ??
    project.data.memberIds.filter(
      (member): member is Exclude<typeof member, string> => typeof member !== 'string',
    );
  const members = allMembers.filter((member) => member.isActive);
  const currentAssigneeId = entityId(task.data?.assigneeId);
  const inactiveAssignee = allMembers.find(
    (member) => member.id === currentAssigneeId && !member.isActive,
  );

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow={project.data.name}
        title={isEditing ? 'Edit task' : 'Create a task'}
        description="Keep ownership, priority and due dates clear for everyone involved."
        actions={
          <Link to={isEditing ? `/tasks/${taskId}` : `/projects/${effectiveProjectId}/tasks`}>
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" /> Cancel
            </Button>
          </Link>
        }
      />
      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
        <Card className="p-5 sm:p-7">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="task-title" className="field-label">
                Task title
                <RequiredMark />
              </label>
              <input
                id="task-title"
                className="field"
                placeholder="A clear, action-oriented title"
                aria-invalid={Boolean(errors.title)}
                {...register('title')}
              />
              <FieldError message={errors.title?.message} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="task-description" className="field-label">
                Description
                <RequiredMark />
              </label>
              <textarea
                id="task-description"
                className="field-area"
                placeholder="Add the context and expected outcome."
                aria-invalid={Boolean(errors.description)}
                {...register('description')}
              />
              <FieldError message={errors.description?.message} />
            </div>
            <div>
              <label htmlFor="task-status" className="field-label">
                Status
                <RequiredMark />
              </label>
              <select id="task-status" className="field" {...register('status')}>
                {(isEditing && task.data
                  ? validTaskTransitions[task.data.status]
                  : (['TODO'] as const)
                ).map((value) => (
                  <option value={value} key={value}>
                    {taskStatusLabels[value]}
                  </option>
                ))}
              </select>
              {!isEditing ? (
                <p className="mt-1.5 text-xs text-slate-400">New tasks start in To do.</p>
              ) : null}
            </div>
            <div>
              <label htmlFor="task-priority" className="field-label">
                Priority
                <RequiredMark />
              </label>
              <select id="task-priority" className="field" {...register('priority')}>
                {Object.entries(priorityLabels).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="task-assignee" className="field-label">
                Assignee
              </label>
              <select id="task-assignee" className="field" {...register('assigneeId')}>
                <option value="">Unassigned</option>
                {inactiveAssignee ? (
                  <option value={inactiveAssignee.id} disabled>
                    {inactiveAssignee.name} · inactive
                  </option>
                ) : null}
                {members.map((member) => (
                  <option value={member.id} key={member.id}>
                    {member.name} · {member.email}
                  </option>
                ))}
              </select>
              {!allMembers.length && project.data.memberIds.length ? (
                <p className="mt-1.5 text-xs text-amber-700">
                  Member details are unavailable; existing assignment will be retained unless
                  cleared.
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="task-due-date" className="field-label">
                Due date
                <RequiredMark />
              </label>
              <input
                id="task-due-date"
                type="date"
                className="field"
                aria-invalid={Boolean(errors.dueDate)}
                {...register('dueDate')}
              />
              <FieldError message={errors.dueDate?.message} />
            </div>
          </div>
        </Card>
        <div className="mt-5 flex justify-end gap-3">
          <Link to={isEditing ? `/tasks/${taskId}` : `/projects/${effectiveProjectId}/tasks`}>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
          <Button type="submit" loading={isSubmitting || mutation.isPending}>
            <Save className="h-4 w-4" /> {isEditing ? 'Save changes' : 'Create task'}
          </Button>
        </div>
      </form>
    </div>
  );
}
