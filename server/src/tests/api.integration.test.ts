import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../app.js';
import { AuditLogModel } from '../modules/audit/auditLog.model.js';
import { TaskModel } from '../modules/tasks/task.model.js';
import { UserModel } from '../modules/users/user.model.js';
import type { UserRole } from '../shared/constants.js';

let memoryServer: MongoMemoryServer;
const PASSWORD = 'ValidPass123!';

interface TestUser {
  id: string;
  token: string;
}

async function createUser(
  email: string,
  role: UserRole = 'TEAM_MEMBER',
  options: { isActive?: boolean; name?: string } = {},
): Promise<TestUser> {
  const user = await UserModel.create({
    name: options.name ?? email.split('@')[0] ?? 'Test User',
    email,
    passwordHash: await bcrypt.hash(PASSWORD, 4),
    role,
    isActive: options.isActive ?? true,
  });
  if (options.isActive === false) return { id: String(user._id), token: '' };
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email, password: PASSWORD })
    .expect(200);
  return { id: String(user._id), token: login.body.data.accessToken as string };
}

function bearer(token: string): string {
  return `Bearer ${token}`;
}

function projectInput(managerId: string, overrides: Record<string, unknown> = {}) {
  return {
    name: 'Learning Platform',
    description: 'Build accessible learning tools.',
    managerId,
    memberIds: [],
    startDate: '2026-01-01T00:00:00.000Z',
    deadline: '2026-12-31T00:00:00.000Z',
    status: 'ACTIVE',
    ...overrides,
  };
}

async function createProject(admin: TestUser, managerId: string, memberIds: string[] = []) {
  const response = await request(app)
    .post('/api/projects')
    .set('Authorization', bearer(admin.token))
    .send(projectInput(managerId, { memberIds }))
    .expect(201);
  return response.body.data.project as { id: string };
}

beforeAll(async () => {
  memoryServer = await MongoMemoryServer.create();
  await mongoose.connect(memoryServer.getUri());
});

afterEach(async () => {
  await Promise.all(
    Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})),
  );
});

afterAll(async () => {
  await mongoose.disconnect();
  await memoryServer.stop();
});

describe('authentication and authorization', () => {
  it('registers a user, normalizes email, hashes the password, and omits the hash', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: '  New Member  ',
        email: 'NEW.MEMBER@EXAMPLE.COM',
        password: PASSWORD,
      })
      .expect(201);

    expect(response.body.data.user).toMatchObject({
      name: 'New Member',
      email: 'new.member@example.com',
      role: 'TEAM_MEMBER',
      isActive: true,
    });
    expect(response.body.data.accessToken).toEqual(expect.any(String));
    expect(response.body.data.user).not.toHaveProperty('passwordHash');

    const stored = await UserModel.findOne({ email: 'new.member@example.com' }).select(
      '+passwordHash',
    );
    expect(stored).not.toBeNull();
    expect(stored?.passwordHash).not.toBe(PASSWORD);
    expect(await bcrypt.compare(PASSWORD, stored?.passwordHash ?? '')).toBe(true);
  });

  it('rejects duplicate email registration without exposing database internals', async () => {
    const payload = { name: 'Member', email: 'duplicate@example.com', password: PASSWORD };
    await request(app).post('/api/auth/register').send(payload).expect(201);
    const response = await request(app).post('/api/auth/register').send(payload).expect(409);
    expect(response.body).toMatchObject({
      success: false,
      message: 'An account with this email already exists.',
      errors: [],
    });
  });

  it('logs in successfully and returns a generic response for a wrong password', async () => {
    await createUser('login@example.com');
    const success = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: PASSWORD })
      .expect(200);
    expect(success.body.data.accessToken).toEqual(expect.any(String));
    const failure = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'wrong-password' })
      .expect(401);
    expect(failure.body.message).toBe('Invalid email or password.');
  });

  it('does not allow an inactive user to log in', async () => {
    await createUser('inactive@example.com', 'TEAM_MEMBER', { isActive: false });
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inactive@example.com', password: PASSWORD })
      .expect(401);
    expect(response.body.message).toBe('Invalid email or password.');
  });

  it('rejects missing and invalid JWTs on protected routes', async () => {
    const missing = await request(app).get('/api/auth/me').expect(401);
    expect(missing.body.message).toBe('Authentication is required.');
    const invalid = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer definitely.invalid.token')
      .expect(401);
    expect(invalid.body.message).toBe('Invalid or expired authentication token.');
  });

  it('enforces role authorization on admin user management', async () => {
    const member = await createUser('member@example.com');
    await request(app).get('/api/users').set('Authorization', bearer(member.token)).expect(403);
    const admin = await createUser('admin@example.com', 'ADMIN');
    const response = await request(app)
      .get('/api/users')
      .set('Authorization', bearer(admin.token))
      .expect(200);
    expect(response.body.data).toHaveLength(2);
  });
});

describe('projects, membership, search, filtering, and pagination', () => {
  it('lets an Admin create a project and rejects a Team Member', async () => {
    const admin = await createUser('admin@example.com', 'ADMIN');
    const manager = await createUser('manager@example.com', 'PROJECT_MANAGER');
    const member = await createUser('member@example.com');
    const project = await createProject(admin, manager.id, [member.id]);
    expect(project.id).toEqual(expect.any(String));
    await request(app)
      .post('/api/projects')
      .set('Authorization', bearer(member.token))
      .send(projectInput(manager.id))
      .expect(403);
  });

  it('rejects a deadline before the project start date', async () => {
    const admin = await createUser('admin@example.com', 'ADMIN');
    const manager = await createUser('manager@example.com', 'PROJECT_MANAGER');
    const response = await request(app)
      .post('/api/projects')
      .set('Authorization', bearer(admin.token))
      .send(projectInput(manager.id, { startDate: '2026-10-01', deadline: '2026-09-01' }))
      .expect(400);
    expect(response.body.errors[0].message).toBe(
      'Project deadline must be on or after the start date.',
    );
  });

  it('restricts a Project Manager to assigned projects', async () => {
    const admin = await createUser('admin@example.com', 'ADMIN');
    const assignedManager = await createUser('assigned@example.com', 'PROJECT_MANAGER');
    const unrelatedManager = await createUser('unrelated@example.com', 'PROJECT_MANAGER');
    const project = await createProject(admin, unrelatedManager.id);
    await request(app)
      .patch(`/api/projects/${project.id}`)
      .set('Authorization', bearer(assignedManager.token))
      .send({ name: 'Unauthorized update' })
      .expect(403);
    const list = await request(app)
      .get('/api/projects')
      .set('Authorization', bearer(assignedManager.token))
      .expect(200);
    expect(list.body.data).toHaveLength(0);

    const filteredList = await request(app)
      .get(`/api/projects?managerId=${unrelatedManager.id}`)
      .set('Authorization', bearer(assignedManager.token))
      .expect(200);
    expect(filteredList.body.data).toHaveLength(0);
  });

  it('adds active members, enriches project detail, and rejects inactive members', async () => {
    const admin = await createUser('admin@example.com', 'ADMIN');
    const manager = await createUser('manager@example.com', 'PROJECT_MANAGER');
    const activeMember = await createUser('active@example.com', 'TEAM_MEMBER', {
      name: 'Active Member',
    });
    const inactiveMember = await createUser('inactive@example.com', 'TEAM_MEMBER', {
      isActive: false,
    });
    const project = await createProject(admin, manager.id);

    const added = await request(app)
      .post(`/api/projects/${project.id}/members`)
      .set('Authorization', bearer(manager.token))
      .send({ userId: activeMember.id })
      .expect(200);
    expect(added.body.data.project.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: activeMember.id, name: 'Active Member' }),
      ]),
    );

    const rejected = await request(app)
      .post(`/api/projects/${project.id}/members`)
      .set('Authorization', bearer(manager.token))
      .send({ userId: inactiveMember.id })
      .expect(400);
    expect(rejected.body.message).toBe('All project members must be active Team Members.');
  });

  it('performs escaped search, status filtering, sorting, and reports pagination metadata', async () => {
    const admin = await createUser('admin@example.com', 'ADMIN');
    const manager = await createUser('manager@example.com', 'PROJECT_MANAGER');
    await createProject(admin, manager.id);
    await createProject(admin, manager.id);
    await request(app)
      .post('/api/projects')
      .set('Authorization', bearer(admin.token))
      .send(projectInput(manager.id, { name: 'Outreach [Pilot]', status: 'PLANNING' }))
      .expect(201);

    const searched = await request(app)
      .get('/api/projects?search=%5BPilot%5D')
      .set('Authorization', bearer(admin.token))
      .expect(200);
    expect(searched.body.data).toHaveLength(1);

    const filtered = await request(app)
      .get('/api/projects?status=ACTIVE&page=1&limit=1&sortBy=name&sortOrder=asc')
      .set('Authorization', bearer(admin.token))
      .expect(200);
    expect(filtered.body.data).toHaveLength(1);
    expect(filtered.body.pagination).toEqual({
      page: 1,
      limit: 1,
      totalItems: 2,
      totalPages: 2,
      hasNextPage: true,
      hasPreviousPage: false,
    });
  });
});

describe('task assignment and status workflow', () => {
  it('creates a task, validates its assignee, and supports task search and filtering', async () => {
    const admin = await createUser('admin@example.com', 'ADMIN');
    const manager = await createUser('manager@example.com', 'PROJECT_MANAGER');
    const member = await createUser('member@example.com');
    const outsider = await createUser('outsider@example.com');
    const project = await createProject(admin, manager.id, [member.id]);

    const invalid = await request(app)
      .post(`/api/projects/${project.id}/tasks`)
      .set('Authorization', bearer(manager.token))
      .send({ title: 'Invalid assignment', dueDate: '2026-08-10', assigneeId: outsider.id })
      .expect(400);
    expect(invalid.body.message).toBe('Select a Team Member who belongs to this project.');

    const created = await request(app)
      .post(`/api/projects/${project.id}/tasks`)
      .set('Authorization', bearer(manager.token))
      .send({
        title: 'Write accessibility plan',
        description: 'Keyboard and contrast work',
        dueDate: '2026-08-10',
        priority: 'HIGH',
        assigneeId: member.id,
      })
      .expect(201);
    expect(created.body.data.task).toMatchObject({
      title: 'Write accessibility plan',
      status: 'TODO',
      priority: 'HIGH',
    });

    const list = await request(app)
      .get(`/api/projects/${project.id}/tasks?search=accessibility&priority=HIGH&page=1&limit=1`)
      .set('Authorization', bearer(member.token))
      .expect(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.pagination.totalItems).toBe(1);
  });

  it('allows an assignee to move through valid statuses and sets completedAt', async () => {
    const admin = await createUser('admin@example.com', 'ADMIN');
    const manager = await createUser('manager@example.com', 'PROJECT_MANAGER');
    const member = await createUser('member@example.com');
    const project = await createProject(admin, manager.id, [member.id]);
    const created = await request(app)
      .post(`/api/projects/${project.id}/tasks`)
      .set('Authorization', bearer(manager.token))
      .send({ title: 'Complete workflow', dueDate: '2026-08-10', assigneeId: member.id })
      .expect(201);
    const taskId = created.body.data.task.id as string;

    await request(app)
      .patch(`/api/tasks/${taskId}/status`)
      .set('Authorization', bearer(member.token))
      .send({ status: 'IN_PROGRESS' })
      .expect(200);
    const completed = await request(app)
      .patch(`/api/tasks/${taskId}/status`)
      .set('Authorization', bearer(member.token))
      .send({ status: 'COMPLETED' })
      .expect(200);
    expect(completed.body.data.task.completedAt).toEqual(expect.any(String));

    const reopened = await request(app)
      .patch(`/api/tasks/${taskId}/status`)
      .set('Authorization', bearer(member.token))
      .send({ status: 'IN_PROGRESS' })
      .expect(200);
    expect(reopened.body.data.task.completedAt).toBeNull();
  });

  it('prevents a Team Member from changing another task or deleting a task', async () => {
    const admin = await createUser('admin@example.com', 'ADMIN');
    const manager = await createUser('manager@example.com', 'PROJECT_MANAGER');
    const member = await createUser('member@example.com');
    const otherMember = await createUser('other@example.com');
    const project = await createProject(admin, manager.id, [member.id, otherMember.id]);
    const task = await TaskModel.create({
      projectId: project.id,
      title: 'Owned by another member',
      dueDate: new Date('2026-08-10'),
      assigneeId: otherMember.id,
      createdBy: manager.id,
    });
    await request(app)
      .patch(`/api/tasks/${String(task._id)}/status`)
      .set('Authorization', bearer(member.token))
      .send({ status: 'IN_PROGRESS' })
      .expect(403);
    await request(app)
      .delete(`/api/tasks/${String(task._id)}`)
      .set('Authorization', bearer(member.token))
      .expect(403);
  });

  it('keeps My Tasks scoped to the authenticated assignee and currently visible projects', async () => {
    const admin = await createUser('admin@example.com', 'ADMIN');
    const manager = await createUser('manager@example.com', 'PROJECT_MANAGER');
    const member = await createUser('member@example.com');
    const otherMember = await createUser('other@example.com');
    const project = await createProject(admin, manager.id, [member.id, otherMember.id]);
    const [ownTask] = await TaskModel.create([
      {
        projectId: project.id,
        title: 'My private assignment',
        dueDate: new Date('2026-08-10'),
        assigneeId: member.id,
        createdBy: manager.id,
      },
      {
        projectId: project.id,
        title: 'Another member assignment',
        dueDate: new Date('2026-08-10'),
        assigneeId: otherMember.id,
        createdBy: manager.id,
      },
    ]);

    const attemptedOverride = await request(app)
      .get(`/api/tasks/my-tasks?assigneeId=${otherMember.id}`)
      .set('Authorization', bearer(member.token))
      .expect(200);
    expect(attemptedOverride.body.data).toHaveLength(1);
    expect(attemptedOverride.body.data[0].id).toBe(String(ownTask?._id));

    await request(app)
      .delete(`/api/projects/${project.id}/members/${member.id}`)
      .set('Authorization', bearer(manager.token))
      .expect(200);
    const afterRemoval = await request(app)
      .get('/api/tasks/my-tasks')
      .set('Authorization', bearer(member.token))
      .expect(200);
    expect(afterRemoval.body.data).toHaveLength(0);
  });
});

describe('task collaboration', () => {
  it('uploads, lists, and deletes attachments without exposing storage details', async () => {
    const admin = await createUser('admin@example.com', 'ADMIN');
    const manager = await createUser('manager@example.com', 'PROJECT_MANAGER');
    const member = await createUser('member@example.com');
    const project = await createProject(admin, manager.id, [member.id]);
    const created = await request(app)
      .post(`/api/projects/${project.id}/tasks`)
      .set('Authorization', bearer(manager.token))
      .send({ title: 'Review attachment', dueDate: '2026-08-10', assigneeId: member.id })
      .expect(201);
    const taskId = created.body.data.task.id as string;

    const uploaded = await request(app)
      .post(`/api/tasks/${taskId}/attachments`)
      .set('Authorization', bearer(member.token))
      .attach('file', Buffer.from('Safe test attachment.'), {
        filename: 'review-notes.txt',
        contentType: 'text/plain',
      })
      .expect(201);
    expect(uploaded.body.data.attachment).toMatchObject({
      originalName: 'review-notes.txt',
      mimeType: 'text/plain',
      size: 21,
    });
    expect(uploaded.body.data.attachment).not.toHaveProperty('storedName');
    const attachmentId = uploaded.body.data.attachment.id as string;

    const listed = await request(app)
      .get(`/api/tasks/${taskId}/attachments`)
      .set('Authorization', bearer(member.token))
      .expect(200);
    expect(listed.body.data).toHaveLength(1);
    expect(listed.body.data[0]).not.toHaveProperty('storedName');

    await request(app)
      .delete(`/api/attachments/${attachmentId}`)
      .set('Authorization', bearer(member.token))
      .expect(200);
    const afterDelete = await request(app)
      .get(`/api/tasks/${taskId}/attachments`)
      .set('Authorization', bearer(member.token))
      .expect(200);
    expect(afterDelete.body.data).toHaveLength(0);
  });
});

describe('dashboard and persistent audit behavior', () => {
  it('returns expected role-scoped aggregation values and project progress', async () => {
    const admin = await createUser('admin@example.com', 'ADMIN');
    const manager = await createUser('manager@example.com', 'PROJECT_MANAGER');
    const member = await createUser('member@example.com');
    const project = await createProject(admin, manager.id, [member.id]);
    await TaskModel.create([
      {
        projectId: project.id,
        title: 'Done',
        dueDate: new Date('2026-01-01'),
        assigneeId: member.id,
        createdBy: manager.id,
        status: 'COMPLETED',
        completedAt: new Date('2025-12-31'),
      },
      {
        projectId: project.id,
        title: 'Doing',
        dueDate: new Date('2026-01-01'),
        assigneeId: member.id,
        createdBy: manager.id,
        status: 'IN_PROGRESS',
      },
      {
        projectId: project.id,
        title: 'Unassigned',
        dueDate: new Date('2027-01-01'),
        createdBy: manager.id,
        status: 'TODO',
      },
    ]);

    const overview = await request(app)
      .get('/api/dashboard/overview')
      .set('Authorization', bearer(admin.token))
      .expect(200);
    expect(overview.body.data.projects).toMatchObject({ total: 1, active: 1, completed: 0 });
    expect(overview.body.data.tasks).toMatchObject({
      total: 3,
      todo: 1,
      inProgress: 1,
      completed: 1,
      pending: 2,
    });

    const progress = await request(app)
      .get('/api/dashboard/project-progress')
      .set('Authorization', bearer(admin.token))
      .expect(200);
    expect(progress.body.data[0]).toMatchObject({ totalTasks: 3, completedTasks: 1, progress: 33 });

    const memberOverview = await request(app)
      .get('/api/dashboard/overview')
      .set('Authorization', bearer(member.token))
      .expect(200);
    expect(memberOverview.body.data.tasks.total).toBe(2);
  });

  it('creates and exposes a safe audit log for an important action', async () => {
    const admin = await createUser('admin@example.com', 'ADMIN');
    const manager = await createUser('manager@example.com', 'PROJECT_MANAGER');
    const project = await createProject(admin, manager.id);
    const stored = await AuditLogModel.findOne({
      action: 'PROJECT_CREATED',
      entityId: project.id,
    }).lean();
    expect(stored).not.toBeNull();
    expect(stored?.metadata).not.toHaveProperty('password');

    const response = await request(app)
      .get('/api/audit-logs?action=PROJECT_CREATED&page=1&limit=10')
      .set('Authorization', bearer(admin.token))
      .expect(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      action: 'PROJECT_CREATED',
      entityType: 'Project',
    });
  });

  it('allow-lists audit filters and rejects a reversed date range', async () => {
    const admin = await createUser('admin@example.com', 'ADMIN');

    const valid = await request(app)
      .get('/api/audit-logs')
      .query({
        action: 'USER_LOGIN',
        entityType: 'User',
        dateFrom: '2020-01-01T00:00:00.000Z',
        dateTo: '2100-01-01T00:00:00.000Z',
      })
      .set('Authorization', bearer(admin.token))
      .expect(200);
    expect(valid.body.data).toHaveLength(1);
    expect(valid.body.data[0]).toMatchObject({ action: 'USER_LOGIN', entityType: 'User' });

    const invalidAction = await request(app)
      .get('/api/audit-logs?action=NOT_A_REAL_ACTION')
      .set('Authorization', bearer(admin.token))
      .expect(400);
    expect(invalidAction.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'action' })]),
    );

    const invalidEntity = await request(app)
      .get('/api/audit-logs?entityType=Unknown')
      .set('Authorization', bearer(admin.token))
      .expect(400);
    expect(invalidEntity.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'entityType' })]),
    );

    const reversedRange = await request(app)
      .get('/api/audit-logs')
      .query({
        dateFrom: '2026-08-04T00:00:00.000Z',
        dateTo: '2026-08-03T00:00:00.000Z',
      })
      .set('Authorization', bearer(admin.token))
      .expect(400);
    expect(reversedRange.body).toMatchObject({
      success: false,
      message: 'Validation failed.',
      errors: [{ path: 'dateTo', message: 'dateTo must be on or after dateFrom.' }],
    });
  });

  it('keeps Team Member performance scoped to their own assigned work', async () => {
    const admin = await createUser('admin@example.com', 'ADMIN');
    const manager = await createUser('manager@example.com', 'PROJECT_MANAGER');
    const member = await createUser('member@example.com');
    const otherMember = await createUser('other@example.com');
    const project = await createProject(admin, manager.id, [member.id, otherMember.id]);
    await TaskModel.create([
      {
        projectId: project.id,
        title: 'Member task',
        dueDate: new Date('2026-08-10'),
        assigneeId: member.id,
        createdBy: manager.id,
      },
      {
        projectId: project.id,
        title: 'Other member task',
        dueDate: new Date('2026-08-10'),
        assigneeId: otherMember.id,
        createdBy: manager.id,
      },
    ]);

    const response = await request(app)
      .get('/api/dashboard/team-performance')
      .set('Authorization', bearer(member.token))
      .expect(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].userId).toBe(member.id);
  });

  it('reports healthy API routing and publishes OpenAPI documentation', async () => {
    const health = await request(app).get('/api/health').expect(200);
    expect(health.body).toMatchObject({
      success: true,
      data: { status: 'ok', database: 'connected' },
    });
    const docs = await request(app).get('/api/docs.json').expect(200);
    expect(docs.body.openapi).toBe('3.0.3');
    expect(docs.body.paths).toHaveProperty('/tasks/{taskId}/status');
  });
});
