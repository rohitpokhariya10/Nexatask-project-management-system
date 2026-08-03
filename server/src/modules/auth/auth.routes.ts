import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../shared/asyncHandler.js';
import { login, me, register } from './auth.controller.js';
import { loginSchema, registerSchema } from './auth.schema.js';
import { env } from '../../config/env.js';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === 'test' ? 1000 : 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Try again later.',
    errors: [],
  },
});

export const authRouter = Router();
authRouter.post(
  '/register',
  authLimiter,
  validate({ body: registerSchema }),
  asyncHandler(register),
);
authRouter.post('/login', authLimiter, validate({ body: loginSchema }), asyncHandler(login));
authRouter.get('/me', authenticate, asyncHandler(me));
