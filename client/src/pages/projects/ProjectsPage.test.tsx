import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { ProjectsPage } from './ProjectsPage';
import { renderWithProviders } from '../../test/render';
import * as apiModule from '../../lib/api';

vi.mock('../../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api')>();
  return { ...actual, requestPaginated: vi.fn(), request: vi.fn() };
});

it('sends project status filters to the API and opens a real project link', async () => {
  const requestPaginated = vi.mocked(apiModule.requestPaginated);
  requestPaginated.mockResolvedValue({
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
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/projects/:projectId" element={<div>Project opened</div>} />
    </Routes>,
    { initialEntries: ['/projects'] },
  );
  expect((await screen.findAllByText('Student Success Launch')).length).toBeGreaterThan(0);
  await user.selectOptions(screen.getByLabelText('Project status'), 'ACTIVE');
  await waitFor(() =>
    expect(requestPaginated).toHaveBeenLastCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ status: 'ACTIVE' }) }),
    ),
  );
  await user.click(screen.getAllByRole('link', { name: /Student Success Launch/ })[0]!);
  expect(await screen.findByText('Project opened')).toBeInTheDocument();
});
