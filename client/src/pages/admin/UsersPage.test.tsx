import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UsersPage } from './UsersPage';
import { adminUser, authValue, renderWithProviders } from '../../test/render';
import * as apiModule from '../../lib/api';

vi.mock('../../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api')>();
  return { ...actual, requestPaginated: vi.fn(), requestResource: vi.fn() };
});

it('sorts users through the API and refreshes auth after changing the current user role', async () => {
  vi.mocked(apiModule.requestPaginated).mockResolvedValue({
    items: [{ ...adminUser, createdAt: '2026-08-01T08:00:00.000Z' }],
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
    ...adminUser,
    role: 'PROJECT_MANAGER',
  });
  const refreshUser = vi.fn(async () => undefined);
  const user = userEvent.setup();
  renderWithProviders(<UsersPage />, {
    auth: authValue(adminUser, { refreshUser }),
  });

  expect(await screen.findByText('Asha Admin')).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText('Sort users'), 'name:asc');
  await waitFor(() =>
    expect(apiModule.requestPaginated).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/users',
        params: expect.objectContaining({ sortBy: 'name', sortOrder: 'asc' }),
      }),
    ),
  );

  await user.selectOptions(screen.getByLabelText('Role for Asha Admin'), 'PROJECT_MANAGER');
  await waitFor(() =>
    expect(apiModule.requestResource).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'PATCH',
        url: '/users/admin-1/role',
        data: { role: 'PROJECT_MANAGER' },
      }),
      'user',
    ),
  );
  expect(refreshUser).toHaveBeenCalledOnce();
});
