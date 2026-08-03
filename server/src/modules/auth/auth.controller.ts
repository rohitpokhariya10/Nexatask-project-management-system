import type { Request, Response } from 'express';
import { sendSuccess } from '../../shared/apiResponse.js';
import { AppError } from '../../shared/appError.js';
import { recordAudit } from '../audit/audit.service.js';
import { UserModel } from '../users/user.model.js';
import { loginUser, registerUser } from './auth.service.js';

export async function register(request: Request, response: Response): Promise<void> {
  const result = await registerUser(
    request.body as { name: string; email: string; password: string },
  );
  await recordAudit({
    actorId: result.user._id,
    action: 'USER_REGISTERED',
    entityType: 'User',
    entityId: result.user._id,
    summary: 'User registered an account.',
    request,
  });
  sendSuccess(
    response,
    { user: result.user, accessToken: result.accessToken },
    {
      statusCode: 201,
      message: 'Registration successful.',
    },
  );
}

export async function login(request: Request, response: Response): Promise<void> {
  const result = await loginUser(request.body as { email: string; password: string });
  await recordAudit({
    actorId: result.user._id,
    action: 'USER_LOGIN',
    entityType: 'User',
    entityId: result.user._id,
    summary: 'User logged in successfully.',
    request,
  });
  sendSuccess(
    response,
    { user: result.user, accessToken: result.accessToken },
    { message: 'Login successful.' },
  );
}

export async function me(request: Request, response: Response): Promise<void> {
  if (!request.user) throw new AppError('Authentication is required.', 401);
  const user = await UserModel.findById(request.user.id);
  if (!user) throw new AppError('User not found.', 404);
  sendSuccess(response, { user });
}
