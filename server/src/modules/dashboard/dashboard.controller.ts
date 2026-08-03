import type { Request, Response } from 'express';
import { sendSuccess } from '../../shared/apiResponse.js';
import { AppError } from '../../shared/appError.js';
import {
  overviewData,
  projectProgressData,
  teamPerformanceData,
  upcomingDeadlinesData,
} from './dashboard.service.js';

function authenticatedUser(request: Request) {
  if (!request.user) throw new AppError('Authentication is required.', 401);
  return request.user;
}

export async function overview(request: Request, response: Response): Promise<void> {
  sendSuccess(response, await overviewData(authenticatedUser(request)));
}

export async function deadlines(request: Request, response: Response): Promise<void> {
  sendSuccess(response, await upcomingDeadlinesData(authenticatedUser(request)));
}

export async function projectProgress(request: Request, response: Response): Promise<void> {
  sendSuccess(response, await projectProgressData(authenticatedUser(request)));
}

export async function teamPerformance(request: Request, response: Response): Promise<void> {
  sendSuccess(response, await teamPerformanceData(authenticatedUser(request)));
}
