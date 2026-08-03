import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { AppError, type ErrorDetail } from '../shared/appError.js';

interface MongoDuplicateError extends Error {
  code: number;
  keyPattern?: Record<string, number>;
}

function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof ZodError) {
    const errors: ErrorDetail[] = error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    return new AppError('Validation failed.', 400, errors);
  }

  if (error instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(error.errors).map((item) => ({
      path: item.path,
      message: item.message,
    }));
    return new AppError('Validation failed.', 400, errors);
  }

  if (error instanceof mongoose.Error.CastError) {
    return new AppError('Invalid identifier.', 400, [
      { path: error.path, message: 'Invalid identifier.' },
    ]);
  }

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return new AppError('Attachment exceeds the allowed file size.', 400);
    }
    return new AppError('Attachment upload failed.', 400, [
      { path: 'file', message: error.message },
    ]);
  }

  if (error instanceof Error && 'code' in error && (error as MongoDuplicateError).code === 11000) {
    const duplicate = error as MongoDuplicateError;
    const field = Object.keys(duplicate.keyPattern ?? {})[0] ?? 'value';
    return new AppError(`A record with this ${field} already exists.`, 409, [
      { path: field, message: `${field} must be unique.` },
    ]);
  }

  return new AppError('An unexpected server error occurred.', 500, [], false);
}

export const notFound: RequestHandler = (request, _response, next) => {
  next(new AppError(`Route ${request.method} ${request.path} was not found.`, 404));
};

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const normalized = normalizeError(error);

  if (env.NODE_ENV !== 'test' && (!normalized.operational || normalized.statusCode >= 500)) {
    console.error(error instanceof Error ? error.message : 'Unknown server error');
  }

  response.status(normalized.statusCode).json({
    success: false,
    message: normalized.message,
    errors: normalized.errors,
  });
};
