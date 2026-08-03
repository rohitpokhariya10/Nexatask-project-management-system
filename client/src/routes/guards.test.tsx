import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute, RoleRoute } from './guards';
import { authValue, memberUser, renderWithProviders } from '../test/render';

describe('route guards', () => {
  it('redirects anonymous visitors to login', async () => {
    renderWithProviders(
      <Routes>
        <Route
          path="/private"
          element={
            <ProtectedRoute>
              <div>Private content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login destination</div>} />
      </Routes>,
      { initialEntries: ['/private'], auth: authValue(null) },
    );
    expect(await screen.findByText('Login destination')).toBeInTheDocument();
    expect(screen.queryByText('Private content')).not.toBeInTheDocument();
  });

  it('redirects a team member away from an admin route', async () => {
    renderWithProviders(
      <Routes>
        <Route
          path="/admin"
          element={
            <RoleRoute roles={['ADMIN']}>
              <div>Admin area</div>
            </RoleRoute>
          }
        />
        <Route path="/forbidden" element={<div>Access denied</div>} />
      </Routes>,
      { initialEntries: ['/admin'], auth: authValue(memberUser) },
    );
    expect(await screen.findByText('Access denied')).toBeInTheDocument();
  });
});
