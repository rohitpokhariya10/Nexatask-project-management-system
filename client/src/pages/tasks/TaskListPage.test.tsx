import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { TaskListPage } from './TaskListPage';
import { authValue, memberUser, renderWithProviders } from '../../test/render';
import * as apiModule from '../../lib/api';

vi.mock('../../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api')>();
  return { ...actual, requestPaginated: vi.fn(), requestResource: vi.fn() };
});

it('lets a member change an assigned task status through the status endpoint', async () => {
  vi.mocked(apiModule.requestPaginated).mockResolvedValue({
    items: [
      {
        id: 'task-1',
        projectId: 'project-1',
        title: 'Confirm mentor roster',
        description: 'Validate the final regional list.',
        status: 'TODO',
        priority: 'HIGH',
        assigneeId: 'member-1',
        dueDate: '2026-08-15',
      },
    ],
    pagination: {
      page: 1,
      limit: 10,
      totalItems: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  });
  vi.mocked(apiModule.requestResource).mockResolvedValue({
    id: 'task-1',
    projectId: 'project-1',
    title: 'Confirm mentor roster',
    description: 'Validate the final regional list.',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    assigneeId: 'member-1',
    dueDate: '2026-08-15',
  });
  const user = userEvent.setup();
  renderWithProviders(
    <Routes>
      <Route path="/tasks/my" element={<TaskListPage mode="mine" />} />
    </Routes>,
    { initialEntries: ['/tasks/my'], auth: authValue(memberUser) },
  );
  expect(await screen.findByText('Confirm mentor roster')).toBeInTheDocument();
  expect(screen.queryByLabelText('Task assignee')).not.toBeInTheDocument();
  await user.selectOptions(
    screen.getByLabelText('Update status for Confirm mentor roster'),
    'IN_PROGRESS',
  );
  await waitFor(() =>
    expect(apiModule.requestResource).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'PATCH',
        url: '/tasks/task-1/status',
        data: { status: 'IN_PROGRESS' },
      }),
      'task',
    ),
  );
});

it('filters project tasks by active assignee and due date and applies sorting', async () => {
  vi.mocked(apiModule.requestResource).mockResolvedValue({
    id: 'project-1',
    name: 'Student Success Launch',
    description: 'Launch the next intake workflow.',
    status: 'ACTIVE',
    managerId: 'admin-1',
    memberIds: ['member-1', 'inactive-1'],
    members: [
      {
        id: 'member-1',
        name: 'Mina Member',
        email: 'mina@example.test',
        role: 'TEAM_MEMBER',
        isActive: true,
      },
      {
        id: 'inactive-1',
        name: 'Inactive Member',
        email: 'inactive@example.test',
        role: 'TEAM_MEMBER',
        isActive: false,
      },
    ],
    startDate: '2026-08-01',
    deadline: '2026-08-30',
  });
  vi.mocked(apiModule.requestPaginated).mockResolvedValue({
    items: [
      {
        id: 'task-1',
        projectId: 'project-1',
        title: 'Confirm mentor roster',
        description: 'Validate the final regional list.',
        status: 'TODO',
        priority: 'HIGH',
        assigneeId: 'member-1',
        dueDate: '2026-08-15',
      },
    ],
    pagination: {
      page: 1,
      limit: 10,
      totalItems: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  });
  const user = userEvent.setup();
  renderWithProviders(
    <Routes>
      <Route path="/projects/:projectId/tasks" element={<TaskListPage />} />
    </Routes>,
    { initialEntries: ['/projects/project-1/tasks'] },
  );

  expect(await screen.findByText('Confirm mentor roster')).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: 'Inactive Member' })).not.toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText('Task assignee'), 'member-1');
  fireEvent.change(screen.getByLabelText('Task due from'), {
    target: { value: '2026-08-10' },
  });
  fireEvent.change(screen.getByLabelText('Task due to'), {
    target: { value: '2026-08-20' },
  });
  await user.selectOptions(screen.getByLabelText('Sort tasks'), 'createdAt:desc');

  await waitFor(() =>
    expect(apiModule.requestPaginated).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/projects/project-1/tasks',
        params: expect.objectContaining({
          assigneeId: 'member-1',
          dueFrom: '2026-08-10',
          dueTo: '2026-08-20',
          sortBy: 'createdAt',
          sortOrder: 'desc',
        }),
      }),
    ),
  );
});
