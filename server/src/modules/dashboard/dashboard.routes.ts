import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../shared/asyncHandler.js';
import { deadlines, overview, projectProgress, teamPerformance } from './dashboard.controller.js';

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);
dashboardRouter.get('/overview', asyncHandler(overview));
dashboardRouter.get('/deadlines', asyncHandler(deadlines));
dashboardRouter.get('/project-progress', asyncHandler(projectProgress));
dashboardRouter.get('/team-performance', asyncHandler(teamPerformance));
