import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../shared/asyncHandler.js';
import { getUser, listUsers, updateUserRole, updateUserStatus } from './user.controller.js';
import {
  updateRoleSchema,
  updateStatusSchema,
  userIdParamsSchema,
  userListQuerySchema,
} from './user.schema.js';

export const userRouter = Router();
userRouter.use(authenticate, authorize('ADMIN'));
userRouter.get('/', validate({ query: userListQuerySchema }), asyncHandler(listUsers));
userRouter.get('/:userId', validate({ params: userIdParamsSchema }), asyncHandler(getUser));
userRouter.patch(
  '/:userId/role',
  validate({ params: userIdParamsSchema, body: updateRoleSchema }),
  asyncHandler(updateUserRole),
);
userRouter.patch(
  '/:userId/status',
  validate({ params: userIdParamsSchema, body: updateStatusSchema }),
  asyncHandler(updateUserStatus),
);
