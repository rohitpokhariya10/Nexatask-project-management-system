import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../shared/asyncHandler.js';
import {
  createTask,
  deleteTask,
  getTask,
  listMyTasks,
  listProjectTasks,
  updateTask,
  updateTaskAssignee,
  updateTaskStatus,
} from './task.controller.js';
import {
  createTaskSchema,
  myTaskListQuerySchema,
  projectTaskParamsSchema,
  taskIdParamsSchema,
  taskListQuerySchema,
  updateTaskAssigneeSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from './task.schema.js';

export const projectTaskRouter = Router({ mergeParams: true });
projectTaskRouter.use(authenticate);
projectTaskRouter.post(
  '/',
  authorize('ADMIN', 'PROJECT_MANAGER'),
  validate({ params: projectTaskParamsSchema, body: createTaskSchema }),
  asyncHandler(createTask),
);
projectTaskRouter.get(
  '/',
  validate({ params: projectTaskParamsSchema, query: taskListQuerySchema }),
  asyncHandler(listProjectTasks),
);

export const taskRouter = Router();
taskRouter.use(authenticate);
taskRouter.get('/my-tasks', validate({ query: myTaskListQuerySchema }), asyncHandler(listMyTasks));
taskRouter.get('/:taskId', validate({ params: taskIdParamsSchema }), asyncHandler(getTask));
taskRouter.patch(
  '/:taskId',
  authorize('ADMIN', 'PROJECT_MANAGER'),
  validate({ params: taskIdParamsSchema, body: updateTaskSchema }),
  asyncHandler(updateTask),
);
taskRouter.delete(
  '/:taskId',
  authorize('ADMIN', 'PROJECT_MANAGER'),
  validate({ params: taskIdParamsSchema }),
  asyncHandler(deleteTask),
);
taskRouter.patch(
  '/:taskId/status',
  validate({ params: taskIdParamsSchema, body: updateTaskStatusSchema }),
  asyncHandler(updateTaskStatus),
);
taskRouter.patch(
  '/:taskId/assignee',
  authorize('ADMIN', 'PROJECT_MANAGER'),
  validate({ params: taskIdParamsSchema, body: updateTaskAssigneeSchema }),
  asyncHandler(updateTaskAssignee),
);
