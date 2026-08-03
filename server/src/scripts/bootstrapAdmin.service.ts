import bcrypt from 'bcrypt';
import { z } from 'zod';
import { env } from '../config/env.js';
import { UserModel } from '../modules/users/user.model.js';

const bootstrapAdminSchema = z
  .object({
    BOOTSTRAP_ADMIN_EMAIL: z
      .string({ required_error: 'BOOTSTRAP_ADMIN_EMAIL is required.' })
      .trim()
      .email('BOOTSTRAP_ADMIN_EMAIL must be a valid email address.')
      .max(254)
      .transform((value) => value.toLowerCase()),
    BOOTSTRAP_ADMIN_PASSWORD: z
      .string({ required_error: 'BOOTSTRAP_ADMIN_PASSWORD is required.' })
      .min(12, 'BOOTSTRAP_ADMIN_PASSWORD must contain at least 12 characters.')
      .max(128, 'BOOTSTRAP_ADMIN_PASSWORD must contain at most 128 characters.')
      .regex(/[a-z]/, 'BOOTSTRAP_ADMIN_PASSWORD must contain a lowercase letter.')
      .regex(/[A-Z]/, 'BOOTSTRAP_ADMIN_PASSWORD must contain an uppercase letter.')
      .regex(/[0-9]/, 'BOOTSTRAP_ADMIN_PASSWORD must contain a number.')
      .regex(/[^A-Za-z0-9]/, 'BOOTSTRAP_ADMIN_PASSWORD must contain a symbol.')
      .refine((value) => value.trim() === value, {
        message: 'BOOTSTRAP_ADMIN_PASSWORD must not start or end with whitespace.',
      }),
  })
  .refine(
    ({ BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD }) =>
      BOOTSTRAP_ADMIN_EMAIL.toLowerCase() !== BOOTSTRAP_ADMIN_PASSWORD.toLowerCase(),
    {
      path: ['BOOTSTRAP_ADMIN_PASSWORD'],
      message: 'BOOTSTRAP_ADMIN_PASSWORD must not match the administrator email.',
    },
  );

export interface BootstrapAdminInput {
  email: string;
  password: string;
}

interface NewAdmin {
  name: string;
  email: string;
  passwordHash: string;
  role: 'ADMIN';
}

export interface BootstrapAdminDependencies {
  adminExists(this: void): Promise<boolean>;
  emailExists(this: void, email: string): Promise<boolean>;
  hashPassword(this: void, password: string): Promise<string>;
  createAdmin(this: void, admin: NewAdmin): Promise<void>;
}

export type BootstrapAdminResult = 'created' | 'already-exists';

export class BootstrapAdminError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BootstrapAdminError';
  }
}

const productionDependencies: BootstrapAdminDependencies = {
  async adminExists() {
    return Boolean(await UserModel.exists({ role: 'ADMIN' }));
  },
  async emailExists(email) {
    return Boolean(await UserModel.exists({ email }));
  },
  async hashPassword(password) {
    return bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
  },
  async createAdmin(admin) {
    await UserModel.create(admin);
  },
};

export function readBootstrapAdminInput(
  environment: NodeJS.ProcessEnv = process.env,
): BootstrapAdminInput {
  const parsed = bootstrapAdminSchema.safeParse(environment);
  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join(' ');
    throw new BootstrapAdminError(`Invalid administrator bootstrap configuration. ${message}`);
  }

  return {
    email: parsed.data.BOOTSTRAP_ADMIN_EMAIL,
    password: parsed.data.BOOTSTRAP_ADMIN_PASSWORD,
  };
}

export async function bootstrapAdmin(
  input: BootstrapAdminInput,
  dependencies: BootstrapAdminDependencies = productionDependencies,
): Promise<BootstrapAdminResult> {
  if (await dependencies.adminExists()) return 'already-exists';

  return createAdmin(input, dependencies);
}

async function createAdmin(
  input: BootstrapAdminInput,
  dependencies: BootstrapAdminDependencies,
): Promise<BootstrapAdminResult> {
  if (await dependencies.emailExists(input.email)) {
    throw new BootstrapAdminError(
      'The bootstrap email already belongs to a non-Admin account; no changes were made.',
    );
  }

  const passwordHash = await dependencies.hashPassword(input.password);
  await dependencies.createAdmin({
    name: 'NexaTask Administrator',
    email: input.email,
    passwordHash,
    role: 'ADMIN',
  });
  return 'created';
}

export async function bootstrapAdminFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
  dependencies: BootstrapAdminDependencies = productionDependencies,
): Promise<BootstrapAdminResult> {
  if (await dependencies.adminExists()) return 'already-exists';
  return createAdmin(readBootstrapAdminInput(environment), dependencies);
}
