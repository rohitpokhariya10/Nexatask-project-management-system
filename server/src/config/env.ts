import 'dotenv/config';
import path from 'node:path';
import { z } from 'zod';

const mongoUri = z
  .string()
  .min(1, 'MONGODB_URI is required.')
  .refine((value) => /^mongodb(?:\+srv)?:\/\//.test(value), 'MONGODB_URI must be a MongoDB URI.');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  MONGODB_URI: mongoUri,
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must contain at least 32 characters.'),
  JWT_EXPIRES_IN: z.string().min(1).default('8h'),
  CLIENT_URL: z.string().min(1).default('http://localhost:5173'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  MAX_FILE_SIZE: z.coerce
    .number()
    .int()
    .positive()
    .max(25 * 1024 * 1024)
    .default(5 * 1024 * 1024),
  UPLOAD_DIRECTORY: z.string().min(1).default('uploads'),
  AUTO_INDEX: z.enum(['true', 'false']).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const message = parsed.error.issues.map((issue) => issue.message).join(' ');
  throw new Error(`Invalid server environment: ${message}`);
}

const uploadDirectory = path.resolve(process.cwd(), parsed.data.UPLOAD_DIRECTORY);

export const env = Object.freeze({ ...parsed.data, uploadDirectory });

export type AppEnvironment = typeof env;
