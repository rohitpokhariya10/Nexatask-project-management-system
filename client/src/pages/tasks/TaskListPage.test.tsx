import { screen, waitFor } from '@testing-library/react';
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
