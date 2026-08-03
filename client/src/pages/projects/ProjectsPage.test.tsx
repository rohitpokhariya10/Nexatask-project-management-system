import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { ProjectsPage } from './ProjectsPage';
import { renderWithProviders } from '../../test/render';
import * as apiModule from '../../lib/api';

vi.mock('../../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api')>();
  return { ...actual, requestPaginated: vi.fn(), request: vi.fn() };
});

it('sends project filters to the API and opens a real project link', async () => {
  const requestPaginated = vi.mocked(apiModule.requestPaginated);
  const pagination = {
    page: 1,
    limit: 10,
    totalItems: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  };
  requestPaginated.mockImplementation(({ url }) => {
    if (url === '/users')
      return Promise.resolve({
        items: [
          {
            id: 'manager-1',
            name: 'Maya Manager',
            email: 'maya@example.test',
            role: 'PROJECT_MANAGER',
            isActive: true,
          },
        ],
        pagination,
      }) as never;
    return Promise.resolve({
      items: [
        {
          id: 'project-1',
          name: 'Student Success Launch',
          description: 'Launch the next intake workflow.',
          status: 'ACTIVE',
          managerId: 'manager-1',
          memberIds: [],
          startDate: '2026-08-01',
          deadline: '2026-08-30',
        },
      ],
      pagination,
    }) as never;
  });
  const user = userEvent.setup();
  renderWithProviders(
    <Routes>
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/projects/:projectId" element={<div>Project opened</div>} />
    </Routes>,
    { initialEntries: ['/projects'] },
  );
  expect((await screen.findAllByText('Student Success Launch')).length).toBeGreaterThan(0);
  await user.selectOptions(screen.getByLabelText('Project status'), 'ACTIVE');
  await user.selectOptions(screen.getByLabelText('Project manager filter'), 'manager-1');
  fireEvent.change(screen.getByLabelText('Project deadline from'), {
    target: { value: '2026-08-01' },
  });
  fireEvent.change(screen.getByLabelText('Project deadline to'), {
    target: { value: '2026-08-31' },
  });
  await waitFor(() =>
    expect(requestPaginated).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/projects',
        params: expect.objectContaining({
          status: 'ACTIVE',
          managerId: 'manager-1',
          deadlineFrom: '2026-08-01',
          deadlineTo: '2026-08-31',
        }),
      }),
    ),
  );
  expect((await screen.findAllByText('Student Success Launch')).length).toBeGreaterThan(0);
  await user.click(screen.getAllByRole('link', { name: /Student Success Launch/ })[0]!);
  expect(await screen.findByText('Project opened')).toBeInTheDocument();
});
