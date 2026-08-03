import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { authValue, memberUser, renderWithProviders } from '../../test/render';

it('shows only navigation allowed for a team member', () => {
  renderWithProviders(
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<div>Dashboard body</div>} />
      </Route>
    </Routes>,
    { initialEntries: ['/dashboard'], auth: authValue(memberUser) },
  );
  expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Projects' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'My tasks' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'User management' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Audit logs' })).not.toBeInTheDocument();
});
