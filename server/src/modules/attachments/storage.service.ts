import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/appError.js';

const ALLOWED_TYPES = new Map<string, string>([
  ['application/pdf', '.pdf'],
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
  ['text/plain', '.txt'],
  ['application/msword', '.doc'],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.docx'],
]);

const relativeFromSource = path.relative(path.resolve(process.cwd(), 'src'), env.uploadDirectory);
if (!relativeFromSource.startsWith('..') && !path.isAbsolute(relativeFromSource)) {
  throw new Error('UPLOAD_DIRECTORY must be outside the source-code directory.');
}

await fs.mkdir(env.uploadDirectory, { recursive: true });

function resolvedStoredPath(storedName: string): string {
  if (storedName !== path.basename(storedName)) throw new AppError('Invalid attachment path.', 400);
  const resolved = path.resolve(env.uploadDirectory, storedName);
  const relative = path.relative(env.uploadDirectory, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative))
    throw new AppError('Invalid attachment path.', 400);
  return resolved;
}

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => callback(null, env.uploadDirectory),
  filename: (_request, file, callback) => {
    const extension = ALLOWED_TYPES.get(file.mimetype);
    if (!extension) return callback(new AppError('This file type is not supported.', 400), '');
    callback(null, `${crypto.randomUUID()}${extension}`);
  },
});

export const attachmentUpload = multer({
  storage,
  limits: { fileSize: env.MAX_FILE_SIZE, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      callback(new AppError('This file type is not supported.', 400));
      return;
    }
    callback(null, true);
  },
});

export function safeOriginalName(value: string): string {
  const baseName = [...path.basename(value)]
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint > 31 && codePoint !== 127;
    })
    .join('')
    .trim();
  return (baseName || 'attachment').slice(0, 255);
}

export function storedFilePath(storedName: string): string {
  return resolvedStoredPath(storedName);
}

export async function deleteStoredFile(storedName: string): Promise<void> {
  try {
    await fs.unlink(resolvedStoredPath(storedName));
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
  }
}
