import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../modules/users/user.model.js';
import { AppError } from '../shared/appError.js';
import { asyncHandler } from '../shared/asyncHandler.js';
import type { UserRole } from '../shared/constants.js';
import { env } from '../config/env.js';

interface JwtPayload {
  sub: string;
}

export const authenticate = asyncHandler(async (request, _response, next) => {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError('Authentication is required.', 401);
  }

  const token = header.slice(7).trim();
  if (!token) throw new AppError('Authentication is required.', 401);

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    throw new AppError('Invalid or expired authentication token.', 401);
  }

  const user = await UserModel.findById(payload.sub);
  if (!user || !user.isActive) {
    throw new AppError('Authentication is no longer valid.', 401);
  }

  request.user = {
    id: String(user._id),
    objectId: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
  next();
});

export function authorize(...roles: UserRole[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.user) return next(new AppError('Authentication is required.', 401));
    if (!roles.includes(request.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }
    next();
  };
}
