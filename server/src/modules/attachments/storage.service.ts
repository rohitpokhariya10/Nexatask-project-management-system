import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { TextDecoder } from 'node:util';
import multer from 'multer';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/appError.js';

interface AllowedType {
  originalExtensions: readonly string[];
  storedExtension: string;
  matchesContents(contents: Buffer): boolean;
}

function startsWith(contents: Buffer, signature: readonly number[]): boolean {
  return (
    contents.length >= signature.length &&
    signature.every((value, index) => contents[index] === value)
  );
}

function isPlainText(contents: Buffer): boolean {
  if (contents.length === 0) return false;
  const executableSignatures = [
    [0x4d, 0x5a],
    [0x7f, 0x45, 0x4c, 0x46],
    [0xfe, 0xed, 0xfa, 0xce],
    [0xce, 0xfa, 0xed, 0xfe],
    [0xfe, 0xed, 0xfa, 0xcf],
    [0xcf, 0xfa, 0xed, 0xfe],
    [0xca, 0xfe, 0xba, 0xbe],
  ] as const;
  if (executableSignatures.some((signature) => startsWith(contents, signature))) return false;

  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(contents);
  } catch {
    return false;
  }
  if (text.trimStart().startsWith('#!')) return false;
  return ![...text].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return (codePoint < 32 && ![9, 10, 12, 13].includes(codePoint)) || codePoint === 127;
  });
}

const ALLOWED_TYPES = new Map<string, AllowedType>([
  [
    'application/pdf',
    {
      originalExtensions: ['.pdf'],
      storedExtension: '.pdf',
      matchesContents: (contents) => contents.subarray(0, 5).toString('ascii') === '%PDF-',
    },
  ],
  [
    'image/png',
    {
      originalExtensions: ['.png'],
      storedExtension: '.png',
      matchesContents: (contents) =>
        startsWith(contents, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    },
  ],
  [
    'image/jpeg',
    {
      originalExtensions: ['.jpg', '.jpeg'],
      storedExtension: '.jpg',
      matchesContents: (contents) => startsWith(contents, [0xff, 0xd8, 0xff]),
    },
  ],
  [
    'text/plain',
    {
      originalExtensions: ['.txt'],
      storedExtension: '.txt',
      matchesContents: isPlainText,
    },
  ],
  [
    'application/msword',
    {
      originalExtensions: ['.doc'],
      storedExtension: '.doc',
      matchesContents: (contents) =>
        startsWith(contents, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]) &&
        contents.includes(Buffer.from('WordDocument', 'utf16le')),
    },
  ],
  [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    {
      originalExtensions: ['.docx'],
      storedExtension: '.docx',
      matchesContents: (contents) =>
        startsWith(contents, [0x50, 0x4b, 0x03, 0x04]) &&
        contents.includes(Buffer.from('[Content_Types].xml')) &&
        contents.includes(Buffer.from('word/document.xml')),
    },
  ],
]);

function uploadError(message: string): AppError {
  return new AppError(message, 400, [{ path: 'file', message }]);
}

function allowedTypeFor(file: Pick<Express.Multer.File, 'mimetype' | 'originalname'>): AllowedType {
  const allowedType = ALLOWED_TYPES.get(file.mimetype);
  if (!allowedType) throw uploadError('This file type is not supported.');
  const extension = path.extname(file.originalname).toLowerCase();
  if (!allowedType.originalExtensions.includes(extension)) {
    throw uploadError('Attachment extension does not match its declared file type.');
  }
  return allowedType;
}

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
    try {
      const allowedType = allowedTypeFor(file);
      callback(null, `${crypto.randomUUID()}${allowedType.storedExtension}`);
    } catch (error) {
      callback(
        error instanceof Error ? error : uploadError('This file type is not supported.'),
        '',
      );
    }
  },
});

export const attachmentUpload = multer({
  storage,
  limits: { fileSize: env.MAX_FILE_SIZE, files: 1 },
  fileFilter: (_request, file, callback) => {
    try {
      allowedTypeFor(file);
      callback(null, true);
    } catch (error) {
      callback(error instanceof Error ? error : uploadError('This file type is not supported.'));
    }
  },
});

export async function validateStoredUpload(file: Express.Multer.File): Promise<void> {
  const allowedType = allowedTypeFor(file);
  const contents = await fs.readFile(resolvedStoredPath(file.filename));
  if (contents.length !== file.size || !allowedType.matchesContents(contents)) {
    throw uploadError('Attachment content does not match its declared file type.');
  }
}

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
