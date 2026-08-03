import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../shared/asyncHandler.js';
import {
  addMembers,
  assignManager,
  createProject,
  deleteProject,
  getProject,
  listEligibleMembers,
  listProjects,
  removeMember,
  updateProject,
} from './project.controller.js';
import {
  addMembersSchema,
  assignManagerSchema,
  createProjectSchema,
  eligibleMemberQuerySchema,
  memberParamsSchema,
  projectIdParamsSchema,
  projectListQuerySchema,
  updateProjectSchema,
} from './project.schema.js';

export const projectRouter = Router();
projectRouter.use(authenticate);
projectRouter.post(
  '/',
  authorize('ADMIN'),
  validate({ body: createProjectSchema }),
  asyncHandler(createProject),
);
projectRouter.get('/', validate({ query: projectListQuerySchema }), asyncHandler(listProjects));
projectRouter.get(
  '/:projectId/eligible-members',
  authorize('ADMIN', 'PROJECT_MANAGER'),
  validate({ params: projectIdParamsSchema, query: eligibleMemberQuerySchema }),
  asyncHandler(listEligibleMembers),
);
projectRouter.get(
  '/:projectId',
  validate({ params: projectIdParamsSchema }),
  asyncHandler(getProject),
);
projectRouter.patch(
  '/:projectId',
  authorize('ADMIN', 'PROJECT_MANAGER'),
  validate({ params: projectIdParamsSchema, body: updateProjectSchema }),
  asyncHandler(updateProject),
);
projectRouter.delete(
  '/:projectId',
  authorize('ADMIN'),
  validate({ params: projectIdParamsSchema }),
  asyncHandler(deleteProject),
);
projectRouter.patch(
  '/:projectId/manager',
  authorize('ADMIN'),
  validate({ params: projectIdParamsSchema, body: assignManagerSchema }),
  asyncHandler(assignManager),
);
projectRouter.post(
  '/:projectId/members',
  authorize('ADMIN', 'PROJECT_MANAGER'),
  validate({ params: projectIdParamsSchema, body: addMembersSchema }),
  asyncHandler(addMembers),
);
projectRouter.delete(
  '/:projectId/members/:userId',
  authorize('ADMIN', 'PROJECT_MANAGER'),
  validate({ params: memberParamsSchema }),
  asyncHandler(removeMember),
);
