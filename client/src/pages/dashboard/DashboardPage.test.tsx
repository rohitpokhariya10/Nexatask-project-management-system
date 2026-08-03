import { screen } from '@testing-library/react';
import { DashboardPage } from './DashboardPage';
import { authValue, memberUser, renderWithProviders } from '../../test/render';
import * as apiModule from '../../lib/api';

vi.mock('../../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api')>();
  return { ...actual, request: vi.fn() };
});

it('explains Team Member permissions and provides real next actions', async () => {
  vi.mocked(apiModule.request).mockImplementation(({ url }) => {
    if (url === '/dashboard/overview') {
      return Promise.resolve({
        projects: { total: 0, active: 0, completed: 0 },
        tasks: { total: 0, todo: 0, inProgress: 0, completed: 0, pending: 0, overdue: 0 },
        completedVsPending: [],
        tasksByStatus: [],
      }) as never;
    }

    if (
      url === '/dashboard/deadlines' ||
      url === '/dashboard/project-progress' ||
      url === '/dashboard/team-performance'
    ) {
      return Promise.resolve([]) as never;
    }

    return Promise.reject(new Error(`Unexpected request: ${url}`));
  });

  renderWithProviders(<DashboardPage />, { auth: authValue(memberUser) });

  expect(
    await screen.findByRole('heading', { name: 'Waiting for an assignment' }),
  ).toBeInTheDocument();
  expect(screen.getByText(/new account starts as a Team Member/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Open my tasks' })).toHaveAttribute('href', '/tasks/my');
  expect(screen.getByRole('link', { name: 'View my projects' })).toHaveAttribute(
    'href',
    '/projects',
  );
});
