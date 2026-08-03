import type { FilterQuery, HydratedDocument, PipelineStage, Types } from 'mongoose';
import type { AuthenticatedUser } from '../../shared/access.js';
import { projectVisibility } from '../../shared/access.js';
import { ProjectModel, type Project } from '../projects/project.model.js';
import { TaskModel, type Task } from '../tasks/task.model.js';

interface DashboardScope {
  projects: HydratedDocument<Project>[];
  projectIds: Types.ObjectId[];
  taskFilter: FilterQuery<Task>;
}

async function dashboardScope(user: AuthenticatedUser): Promise<DashboardScope> {
  const projects = await ProjectModel.find(projectVisibility(user));
  const projectIds = projects.map((project) => project._id);
  const taskFilter: FilterQuery<Task> = { projectId: { $in: projectIds } };
  if (user.role === 'TEAM_MEMBER') taskFilter.assigneeId = user.objectId;
  return { projects, projectIds, taskFilter };
}

function countFor(rows: { _id: string; count: number }[], status: string): number {
  return rows.find((row) => row._id === status)?.count ?? 0;
}

export async function overviewData(user: AuthenticatedUser) {
  const scope = await dashboardScope(user);
  const now = new Date();
  const [projectStatusRows, taskStatusRows, overdueRows] = await Promise.all([
    ProjectModel.aggregate<{ _id: string; count: number }>([
      { $match: projectVisibility(user) as PipelineStage.Match['$match'] },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    TaskModel.aggregate<{ _id: string; count: number }>([
      { $match: scope.taskFilter as PipelineStage.Match['$match'] },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    TaskModel.aggregate<{ count: number }>([
      {
        $match: {
          ...scope.taskFilter,
          status: { $ne: 'COMPLETED' },
          dueDate: { $lt: now },
        } as PipelineStage.Match['$match'],
      },
      { $count: 'count' },
    ]),
  ]);
  const totalProjects = projectStatusRows.reduce((total, row) => total + row.count, 0);
  const todo = countFor(taskStatusRows, 'TODO');
  const inProgress = countFor(taskStatusRows, 'IN_PROGRESS');
  const completed = countFor(taskStatusRows, 'COMPLETED');
  const pending = todo + inProgress;
  const totalTasks = pending + completed;
  return {
    projects: {
      total: totalProjects,
      active: countFor(projectStatusRows, 'ACTIVE'),
      completed: countFor(projectStatusRows, 'COMPLETED'),
    },
    tasks: {
      total: totalTasks,
      todo,
      inProgress,
      completed,
      pending,
      overdue: overdueRows[0]?.count ?? 0,
    },
    completedVsPending: [
      { name: 'Completed', value: completed },
      { name: 'Pending', value: pending },
    ],
    tasksByStatus: [
      { status: 'TODO', count: todo },
      { status: 'IN_PROGRESS', count: inProgress },
      { status: 'COMPLETED', count: completed },
    ],
  };
}

export async function upcomingDeadlinesData(user: AuthenticatedUser) {
  const scope = await dashboardScope(user);
  const now = new Date();
  const through = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const [projects, tasks] = await Promise.all([
    ProjectModel.find({
      _id: { $in: scope.projectIds },
      deadline: { $gte: now, $lte: through },
      status: { $ne: 'COMPLETED' },
    }).lean(),
    TaskModel.find({
      ...scope.taskFilter,
      dueDate: { $gte: now, $lte: through },
      status: { $ne: 'COMPLETED' },
    }).lean(),
  ]);
  return [
    ...projects.map((project) => ({
      type: 'PROJECT' as const,
      id: String(project._id),
      title: project.name,
      deadline: project.deadline,
      status: project.status,
      projectId: String(project._id),
    })),
    ...tasks.map((task) => ({
      type: 'TASK' as const,
      id: String(task._id),
      title: task.title,
      deadline: task.dueDate,
      status: task.status,
      projectId: String(task.projectId),
    })),
  ].sort((left, right) => left.deadline.getTime() - right.deadline.getTime());
}

export async function projectProgressData(user: AuthenticatedUser) {
  const scope = await dashboardScope(user);
  const rows = await TaskModel.aggregate<{
    _id: Types.ObjectId;
    totalTasks: number;
    completedTasks: number;
  }>([
    { $match: { projectId: { $in: scope.projectIds } } },
    {
      $group: {
        _id: '$projectId',
        totalTasks: { $sum: 1 },
        completedTasks: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
      },
    },
  ]);
  const byProject = new Map(rows.map((row) => [String(row._id), row]));
  return scope.projects.map((project) => {
    const row = byProject.get(String(project._id));
    const totalTasks = row?.totalTasks ?? 0;
    const completedTasks = row?.completedTasks ?? 0;
    return {
      projectId: String(project._id),
      name: project.name,
      status: project.status,
      totalTasks,
      completedTasks,
      progress: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
    };
  });
}

export async function teamPerformanceData(user: AuthenticatedUser) {
  const scope = await dashboardScope(user);
  const now = new Date();
  const performanceFilter: FilterQuery<Task> = { ...scope.taskFilter };
  if (user.role !== 'TEAM_MEMBER') performanceFilter.assigneeId = { $ne: null };
  return TaskModel.aggregate([
    { $match: performanceFilter as PipelineStage.Match['$match'] },
    {
      $group: {
        _id: '$assigneeId',
        assignedTaskCount: { $sum: 1 },
        completedTaskCount: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
        overdueTaskCount: {
          $sum: {
            $cond: [
              { $and: [{ $ne: ['$status', 'COMPLETED'] }, { $lt: ['$dueDate', now] }] },
              1,
              0,
            ],
          },
        },
      },
    },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    {
      $project: {
        _id: 0,
        userId: { $toString: '$_id' },
        name: '$user.name',
        assignedTaskCount: 1,
        completedTaskCount: 1,
        overdueTaskCount: 1,
        completionPercentage: {
          $round: [
            { $multiply: [{ $divide: ['$completedTaskCount', '$assignedTaskCount'] }, 100] },
            0,
          ],
        },
      },
    },
    { $sort: { completionPercentage: -1, name: 1 } },
  ]);
}
