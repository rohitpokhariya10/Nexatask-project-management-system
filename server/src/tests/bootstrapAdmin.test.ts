import { describe, expect, it, vi } from 'vitest';
import {
  bootstrapAdmin,
  bootstrapAdminFromEnvironment,
  BootstrapAdminError,
  type BootstrapAdminDependencies,
  readBootstrapAdminInput,
} from '../scripts/bootstrapAdmin.service.js';

function dependencies(
  overrides: Partial<BootstrapAdminDependencies> = {},
): BootstrapAdminDependencies {
  return {
    adminExists: vi.fn().mockResolvedValue(false),
    emailExists: vi.fn().mockResolvedValue(false),
    hashPassword: vi.fn().mockResolvedValue('safe-password-hash'),
    createAdmin: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('administrator bootstrap configuration', () => {
  it('requires both bootstrap variables without including their values in errors', () => {
    const secret = 'DoNotLeakThis!123';

    expect(() => readBootstrapAdminInput({ BOOTSTRAP_ADMIN_PASSWORD: secret })).toThrowError(
      'BOOTSTRAP_ADMIN_EMAIL is required.',
    );

    try {
      readBootstrapAdminInput({ BOOTSTRAP_ADMIN_PASSWORD: secret });
    } catch (error) {
      expect(error).toBeInstanceOf(BootstrapAdminError);
      expect((error as Error).message).not.toContain(secret);
    }
  });

  it.each([
    'short',
    'onlylowercase!123',
    'ONLYUPPERCASE!123',
    'NoNumbersIncluded!',
    'NoSymbolsIncluded123',
    ' LeadingSpace!123',
    'TrailingSpace!123 ',
  ])('rejects an unsafe password policy case', (password) => {
    expect(() =>
      readBootstrapAdminInput({
        BOOTSTRAP_ADMIN_EMAIL: 'owner@example.com',
        BOOTSTRAP_ADMIN_PASSWORD: password,
      }),
    ).toThrow(BootstrapAdminError);
  });

  it('normalizes a valid email and preserves the password exactly', () => {
    const password = 'Strong-Random!Pass123';
    expect(
      readBootstrapAdminInput({
        BOOTSTRAP_ADMIN_EMAIL: '  Owner@Example.COM  ',
        BOOTSTRAP_ADMIN_PASSWORD: password,
      }),
    ).toEqual({ email: 'owner@example.com', password });
  });
});

describe('administrator bootstrap behavior', () => {
  it('does not require bootstrap secrets after an Admin exists', async () => {
    const deps = dependencies({ adminExists: vi.fn().mockResolvedValue(true) });

    await expect(bootstrapAdminFromEnvironment({}, deps)).resolves.toBe('already-exists');
    expect(deps.emailExists).not.toHaveBeenCalled();
    expect(deps.hashPassword).not.toHaveBeenCalled();
    expect(deps.createAdmin).not.toHaveBeenCalled();
  });

  it('does nothing when an Admin already exists', async () => {
    const deps = dependencies({ adminExists: vi.fn().mockResolvedValue(true) });

    await expect(
      bootstrapAdmin({ email: 'owner@example.com', password: 'Strong-Random!Pass123' }, deps),
    ).resolves.toBe('already-exists');
    expect(deps.emailExists).not.toHaveBeenCalled();
    expect(deps.hashPassword).not.toHaveBeenCalled();
    expect(deps.createAdmin).not.toHaveBeenCalled();
  });

  it('creates exactly one hashed Admin for an unused email', async () => {
    const deps = dependencies();
    const password = 'Strong-Random!Pass123';

    await expect(bootstrapAdmin({ email: 'owner@example.com', password }, deps)).resolves.toBe(
      'created',
    );
    expect(deps.hashPassword).toHaveBeenCalledWith(password);
    expect(deps.createAdmin).toHaveBeenCalledTimes(1);
    expect(deps.createAdmin).toHaveBeenCalledWith({
      name: 'NexaTask Administrator',
      email: 'owner@example.com',
      passwordHash: 'safe-password-hash',
      role: 'ADMIN',
    });
  });

  it('refuses to promote an existing non-Admin account', async () => {
    const deps = dependencies({ emailExists: vi.fn().mockResolvedValue(true) });

    await expect(
      bootstrapAdmin({ email: 'member@example.com', password: 'Strong-Random!Pass123' }, deps),
    ).rejects.toThrow('no changes were made');
    expect(deps.hashPassword).not.toHaveBeenCalled();
    expect(deps.createAdmin).not.toHaveBeenCalled();
  });
});
