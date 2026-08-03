import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext, type AuthContextValue } from '../features/auth/auth-context';
import type { User } from '../types/api';

export const adminUser: User = {
  id: 'admin-1',
  name: 'Asha Admin',
  email: 'asha@example.test',
  role: 'ADMIN',
  isActive: true,
};
export const memberUser: User = {
  id: 'member-1',
  name: 'Mina Member',
  email: 'mina@example.test',
  role: 'TEAM_MEMBER',
  isActive: true,
};

export function authValue(
  user: User | null = adminUser,
  overrides: Partial<AuthContextValue> = {},
): AuthContextValue {
  return {
    user,
    isAuthenticated: Boolean(user),
    isInitializing: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    ...overrides,
  };
}

export function TestProviders({
  children,
  initialEntries = ['/'],
  auth = authValue(),
}: {
  children: ReactNode;
  initialEntries?: string[];
  auth?: AuthContextValue;
}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={initialEntries}>
        <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options?: { initialEntries?: string[]; auth?: AuthContextValue },
) {
  return render(
    <TestProviders initialEntries={options?.initialEntries} auth={options?.auth}>
      {ui}
    </TestProviders>,
  );
}
