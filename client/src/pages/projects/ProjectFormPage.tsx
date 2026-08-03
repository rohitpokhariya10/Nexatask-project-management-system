import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { ArrowLeft, Save } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { ErrorState, PageLoader } from '../../components/common/AsyncState';
import { Button, Card, FieldError, PageHeader, RequiredMark } from '../../components/common/ui';
import { getApiError, requestPaginated, requestResource } from '../../lib/api';
import { dateInputValue, entityId, projectStatusLabels } from '../../lib/utils';
import type { Project, User } from '../../types/api';

const projectSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Name is required.')
      .max(120, 'Name must be 120 characters or fewer.'),
    description: z
      .string()
      .trim()
      .min(1, 'Description is required.')
      .max(2000, 'Description must be 2,000 characters or fewer.'),
    status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED']),
    managerId: z.string().min(1, 'Select an active Project Manager.'),
    memberIds: z.array(z.string()),
    startDate: z.string().min(1, 'Start date is required.'),
    deadline: z.string().min(1, 'Project deadline is required.'),
  })
  .superRefine((values, context) => {
    if (values.startDate && values.deadline && values.deadline < values.startDate)
      context.addIssue({
        code: 'custom',
        path: ['deadline'],
        message: 'Project deadline must be on or after the start date.',
      });
  });

type ProjectValues = z.infer<typeof projectSchema>;

export function ProjectFormPage() {
  const { projectId } = useParams();
  const isEditing = Boolean(projectId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const project = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => requestResource<Project>({ url: `/projects/${projectId}` }, 'project'),
    enabled: isEditing,
  });
  const users = useQuery({
    queryKey: ['users', 'project-form'],
    queryFn: () =>
      requestPaginated<User>({
        url: '/users',
        params: { limit: 100, isActive: true, sortBy: 'name', sortOrder: 'asc' },
      }),
    enabled: !isEditing,
  });
  const {
    register,
    control,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProjectValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
      status: 'PLANNING',
      managerId: '',
      memberIds: [],
      startDate: '',
      deadline: '',
    },
  });

  useEffect(() => {
    if (project.data)
      reset({
        name: project.data.name,
        description: project.data.description,
        status: project.data.status,
        managerId: entityId(project.data.managerId),
        memberIds: [],
        startDate: dateInputValue(project.data.startDate),
        deadline: dateInputValue(project.data.deadline),
      });
  }, [project.data, reset]);

  const mutation = useMutation({
    mutationFn: async (values: ProjectValues) => {
      const data = isEditing
        ? {
            name: values.name,
            description: values.description,
            status: values.status,
            startDate: values.startDate,
            deadline: values.deadline,
          }
        : values;
      return requestResource<Project>(
        {
          method: isEditing ? 'PATCH' : 'POST',
          url: isEditing ? `/projects/${projectId}` : '/projects',
          data,
        },
        'project',
      );
    },
    onSuccess: (saved) => {
      toast.success(isEditing ? 'Project updated.' : 'Project created.');
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void queryClient.invalidateQueries({ queryKey: ['project', saved.id] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate(`/projects/${saved.id}`);
    },
    onError: (error) =>
      toast.error(getApiError(error, `Unable to ${isEditing ? 'update' : 'create'} the project.`)),
  });

  if (isEditing && project.isPending) return <PageLoader label="Loading project" />;
  if (isEditing && project.isError)
    return (
      <ErrorState
        message={getApiError(project.error, 'Project is unavailable.')}
        onRetry={() => void project.refetch()}
      />
    );

  const activeUsers = users.data?.items ?? [];
  const managers = activeUsers.filter(
    (candidate) => candidate.role === 'ADMIN' || candidate.role === 'PROJECT_MANAGER',
  );
  const members = activeUsers.filter((candidate) => candidate.role === 'TEAM_MEMBER');

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Projects"
        title={isEditing ? 'Edit project' : 'Create a project'}
        description={
          isEditing
            ? 'Update the plan, timing and current status.'
            : 'Define the project, appoint ownership and choose the initial team.'
        }
        actions={
          <Link to={isEditing ? `/projects/${projectId}` : '/projects'}>
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
              <label className="field-label" htmlFor="project-name">
                Project name
                <RequiredMark />
              </label>
              <input
                id="project-name"
                className="field"
                placeholder="e.g. Regional admissions rollout"
                aria-invalid={Boolean(errors.name)}
                {...register('name')}
              />
              <FieldError message={errors.name?.message} />
            </div>
            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="project-description">
                Description
                <RequiredMark />
              </label>
              <textarea
                id="project-description"
                className="field-area"
                placeholder="Describe the outcome, scope and what success looks like."
                aria-invalid={Boolean(errors.description)}
                {...register('description')}
              />
              <FieldError message={errors.description?.message} />
            </div>
            <div>
              <label className="field-label" htmlFor="project-status">
                Status
                <RequiredMark />
              </label>
              <select id="project-status" className="field" {...register('status')}>
                {Object.entries(projectStatusLabels).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
              <FieldError message={errors.status?.message} />
            </div>
            {!isEditing ? (
              <div>
                <label className="field-label" htmlFor="manager">
                  Project manager
                  <RequiredMark />
                </label>
                <select
                  id="manager"
                  className="field"
                  aria-invalid={Boolean(errors.managerId)}
                  {...register('managerId')}
                >
                  <option value="">Select an active manager</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name} · {manager.email}
                    </option>
                  ))}
                </select>
                {users.isError ? (
                  <FieldError message="Active managers could not be loaded." />
                ) : (
                  <FieldError message={errors.managerId?.message} />
                )}
              </div>
            ) : null}
            <div>
              <label className="field-label" htmlFor="start-date">
                Start date
                <RequiredMark />
              </label>
              <input
                id="start-date"
                type="date"
                className="field"
                aria-invalid={Boolean(errors.startDate)}
                {...register('startDate')}
              />
              <FieldError message={errors.startDate?.message} />
            </div>
            <div>
              <label className="field-label" htmlFor="deadline">
                Deadline
                <RequiredMark />
              </label>
              <input
                id="deadline"
                type="date"
                className="field"
                aria-invalid={Boolean(errors.deadline)}
                {...register('deadline')}
              />
              <FieldError message={errors.deadline?.message} />
            </div>
            {!isEditing ? (
              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="members">
                  Initial team members
                </label>
                <Controller
                  name="memberIds"
                  control={control}
                  render={({ field }) => (
                    <select
                      id="members"
                      multiple
                      className="field min-h-36 py-2"
                      value={field.value}
                      onChange={(event) =>
                        field.onChange(
                          Array.from(event.target.selectedOptions, (option) => option.value),
                        )
                      }
                    >
                      {members.map((member) => (
                        <option className="py-1.5" key={member.id} value={member.id}>
                          {member.name} · {member.email}
                        </option>
                      ))}
                    </select>
                  )}
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  Use Ctrl/Command to select more than one person.
                </p>
              </div>
            ) : null}
          </div>
        </Card>
        <div className="mt-5 flex justify-end gap-3">
          <Link to={isEditing ? `/projects/${projectId}` : '/projects'}>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            loading={isSubmitting || mutation.isPending}
            disabled={!isEditing && users.isPending}
          >
            <Save className="h-4 w-4" /> {isEditing ? 'Save changes' : 'Create project'}
          </Button>
        </div>
      </form>
    </div>
  );
}
