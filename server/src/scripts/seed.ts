import bcrypt from 'bcrypt';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import { AttachmentModel } from '../modules/attachments/attachment.model.js';
import { AuditLogModel } from '../modules/audit/auditLog.model.js';
import { CommentModel } from '../modules/comments/comment.model.js';
import { ProjectModel } from '../modules/projects/project.model.js';
import { TaskModel } from '../modules/tasks/task.model.js';
import { UserModel } from '../modules/users/user.model.js';

const DEMO_PASSWORD = 'Demo@12345';

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

async function seed(): Promise<void> {
  if (env.NODE_ENV === 'production') throw new Error('The demo seed cannot run in production.');
  await connectDatabase();

  await Promise.all([
    AttachmentModel.deleteMany({}),
    AuditLogModel.deleteMany({}),
    CommentModel.deleteMany({}),
    TaskModel.deleteMany({}),
    ProjectModel.deleteMany({}),
    UserModel.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, env.BCRYPT_SALT_ROUNDS);
  const [admin, manager, member1, member2, member3] = await UserModel.create([
    { name: 'Nexa Admin', email: 'admin@nexatask.demo', passwordHash, role: 'ADMIN' },
    { name: 'Project Lead', email: 'manager@nexatask.demo', passwordHash, role: 'PROJECT_MANAGER' },
    { name: 'Avery Member', email: 'member1@nexatask.demo', passwordHash, role: 'TEAM_MEMBER' },
    { name: 'Blake Member', email: 'member2@nexatask.demo', passwordHash, role: 'TEAM_MEMBER' },
    { name: 'Casey Member', email: 'member3@nexatask.demo', passwordHash, role: 'TEAM_MEMBER' },
  ]);
  if (!admin || !manager || !member1 || !member2 || !member3)
    throw new Error('Failed to create demo users.');

  const [learningProject, outreachProject] = await ProjectModel.create([
    {
      name: 'Learning Access Portal',
      description: 'Coordinate the first release of the student learning-access portal.',
      status: 'ACTIVE',
      managerId: manager._id,
      memberIds: [manager._id, member1._id, member2._id],
      startDate: daysFromNow(-21),
      deadline: daysFromNow(14),
      createdBy: admin._id,
    },
    {
      name: 'Community Outreach Sprint',
      description: 'Prepare materials and workflows for the education outreach pilot.',
      status: 'PLANNING',
      managerId: manager._id,
      memberIds: [manager._id, member2._id, member3._id],
      startDate: daysFromNow(-4),
      deadline: daysFromNow(30),
      createdBy: admin._id,
    },
  ]);
  if (!learningProject || !outreachProject) throw new Error('Failed to create demo projects.');

  const tasks = await TaskModel.create([
    {
      projectId: learningProject._id,
      title: 'Map student onboarding journey',
      description: 'Document key touchpoints and accessibility requirements.',
      status: 'COMPLETED',
      priority: 'HIGH',
      assigneeId: member1._id,
      createdBy: manager._id,
      dueDate: daysFromNow(-5),
      completedAt: daysFromNow(-6),
    },
    {
      projectId: learningProject._id,
      title: 'Build course discovery filters',
      description: 'Implement subject and learning-level filtering.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      assigneeId: member2._id,
      createdBy: manager._id,
      dueDate: daysFromNow(3),
    },
    {
      projectId: learningProject._id,
      title: 'Review accessibility checklist',
      description: 'Complete the keyboard and screen-reader review.',
      status: 'TODO',
      priority: 'MEDIUM',
      assigneeId: member1._id,
      createdBy: manager._id,
      dueDate: daysFromNow(-2),
    },
    {
      projectId: outreachProject._id,
      title: 'Draft partner briefing',
      description: 'Create the first briefing draft for partner schools.',
      status: 'TODO',
      priority: 'LOW',
      assigneeId: member3._id,
      createdBy: manager._id,
      dueDate: daysFromNow(6),
    },
    {
      projectId: outreachProject._id,
      title: 'Confirm pilot calendar',
      description: 'Align the pilot schedule with all participating groups.',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      assigneeId: member2._id,
      createdBy: manager._id,
      dueDate: daysFromNow(10),
    },
  ]);
  const firstTask = tasks[0];
  const secondTask = tasks[1];
  if (!firstTask || !secondTask) throw new Error('Failed to create demo tasks.');

  await CommentModel.create([
    {
      taskId: firstTask._id,
      authorId: manager._id,
      body: 'The journey map is ready for final review.',
    },
    {
      taskId: firstTask._id,
      authorId: member1._id,
      body: 'Accessibility notes have been incorporated.',
    },
    {
      taskId: secondTask._id,
      authorId: member2._id,
      body: 'The subject filter is complete; level filtering is next.',
    },
  ]);

  await AuditLogModel.create([
    {
      actorId: admin._id,
      action: 'PROJECT_CREATED',
      entityType: 'Project',
      entityId: learningProject._id,
      summary: `Demo project “${learningProject.name}” created.`,
      metadata: { source: 'development-seed' },
    },
    {
      actorId: manager._id,
      action: 'TASK_CREATED',
      entityType: 'Task',
      entityId: firstTask._id,
      summary: `Demo task “${firstTask.title}” created.`,
      metadata: { source: 'development-seed' },
    },
  ]);

  console.info('Development data seeded.');
  console.info('Admin: admin@nexatask.demo');
  console.info('Project Manager: manager@nexatask.demo');
  console.info('Team Members: member1@nexatask.demo, member2@nexatask.demo, member3@nexatask.demo');
}

seed()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Seed failed.');
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
