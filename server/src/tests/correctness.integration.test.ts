import fs from 'node:fs/promises';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../app.js';
import { env } from '../config/env.js';
import { AttachmentModel } from '../modules/attachments/attachment.model.js';
import { AuditLogModel } from '../modules/audit/auditLog.model.js';
import { ProjectModel } from '../modules/projects/project.model.js';
import { TaskModel } from '../modules/tasks/task.model.js';
import { UserModel } from '../modules/users/user.model.js';
import type { UserRole } from '../shared/constants.js';

let memoryServer: MongoMemoryServer | undefined;
const PASSWORD = 'ValidPass123!';

interface TestUser {
  id: string;
  token: string;
}

async function createUser(email: string, role: UserRole = 'TEAM_MEMBER'): Promise<TestUser> {
  const user = await UserModel.create({
    name: email.split('@')[0] ?? 'Test User',
    email,
    passwordHash: await bcrypt.hash(PASSWORD, 4),
    role,
  });
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email, password: PASSWORD })
    .expect(200);
  return { id: String(user._id), token: login.body.data.accessToken as string };
}

function bearer(token: string): string {
  return `Bearer ${token}`;
}

function projectInput(managerId: string, memberIds: string[] = []) {
  return {
    name: 'Correctness Project',
    description: 'Exercise cross-entity correctness rules.',
    managerId,
    memberIds,
    startDate: '2026-01-01T00:00:00.000Z',
    deadline: '2026-12-31T00:00:00.000Z',
    status: 'ACTIVE',
  };
}

async function createProject(admin: TestUser, managerId: string, memberIds: string[] = []) {
  const response = await request(app)
    .post('/api/projects')
    .set('Authorization', bearer(admin.token))
    .send(projectInput(managerId, memberIds))
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
  await memoryServer?.stop();
});

describe('request parsing and partial update validation', () => {
  it('returns safe 400 and 413 responses for malformed and oversized JSON', async () => {
    const malformed = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send('{"name":"Broken",')
      .expect(400);
    expect(malformed.body).toMatchObject({
      success: false,
      message: 'Malformed JSON request body.',
      errors: [{ path: 'body', message: 'Enter valid JSON.' }],
    });

    const oversized = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'x'.repeat(1_100_000),
        email: 'oversized@example.com',
        password: PASSWORD,
      })
      .expect(413);
    expect(oversized.body).toMatchObject({
      success: false,
      message: 'Request body exceeds the allowed size.',
      errors: [{ path: 'body' }],
    });
  });

  it('rejects empty project and task update bodies', async () => {
    const admin = await createUser('admin@example.com', 'ADMIN');
    const manager = await createUser('manager@example.com', 'PROJECT_MANAGER');
    const project = await createProject(admin, manager.id);
    const task = await TaskModel.create({
      projectId: project.id,
      title: 'Unchanged task',
      dueDate: new Date('2026-08-10'),
      createdBy: manager.id,
    });

    const projectResponse = await request(app)
      .patch(`/api/projects/${project.id}`)
      .set('Authorization', bearer(admin.token))
      .send({})
      .expect(400);
    expect(projectResponse.body.errors[0].message).toBe(
      'Provide at least one project field to update.',
    );

    const taskResponse = await request(app)
      .patch(`/api/tasks/${String(task._id)}`)
      .set('Authorization', bearer(admin.token))
      .send({})
      .expect(400);
    expect(taskResponse.body.errors[0].message).toBe('Provide at least one task field to update.');
  });
});

describe('user lifecycle invariants', () => {
  it('does not demote an Admin who still manages a project to Team Member', async () => {
    const actor = await createUser('actor@example.com', 'ADMIN');
    const managedAdmin = await createUser('managed-admin@example.com', 'ADMIN');
    await ProjectModel.create({
      ...projectInput(managedAdmin.id),
      memberIds: [managedAdmin.id],
      createdBy: actor.id,
    });

    const response = await request(app)
      .patch(`/api/users/${managedAdmin.id}/role`)
      .set('Authorization', bearer(actor.token))
      .send({ role: 'TEAM_MEMBER' })
      .expect(409);
    expect(response.body.message).toBe(
      'Reassign this user’s managed projects before changing their role.',
    );
    expect((await UserModel.findById(managedAdmin.id))?.role).toBe('ADMIN');
  });

  it('does not deactivate a project member with assigned work', async () => {
    const admin = await createUser('admin@example.com', 'ADMIN');
    const manager = await createUser('manager@example.com', 'PROJECT_MANAGER');
    const member = await createUser('member@example.com');
    const project = await ProjectModel.create({
      ...projectInput(manager.id),
      memberIds: [manager.id, member.id],
      createdBy: admin.id,
    });
    await TaskModel.create({
      projectId: project._id,
      title: 'Assigned work',
      dueDate: new Date('2026-08-10'),
      assigneeId: member.id,
      createdBy: manager.id,
    });

    const response = await request(app)
      .patch(`/api/users/${member.id}/status`)
      .set('Authorization', bearer(admin.token))
      .send({ isActive: false })
      .expect(409);
    expect(response.body.message).toBe(
      'Remove this user from all projects and reassign their tasks before deactivating them.',
    );
    expect((await UserModel.findById(member.id))?.isActive).toBe(true);
  });
});

describe('create-time assignment audit events', () => {
  it('records manager, initial-member, and initial-task-assignee actions', async () => {
    const admin = await createUser('admin@example.com', 'ADMIN');
    const manager = await createUser('manager@example.com', 'PROJECT_MANAGER');
    const firstMember = await createUser('first@example.com');
    const secondMember = await createUser('second@example.com');
    const project = await createProject(admin, manager.id, [firstMember.id, secondMember.id]);

    const projectActions = await AuditLogModel.find({
      entityType: 'Project',
      entityId: project.id,
    }).lean();
    expect(projectActions.map((entry) => entry.action)).toEqual(
      expect.arrayContaining([
        'PROJECT_CREATED',
        'PROJECT_MANAGER_ASSIGNED',
        'PROJECT_MEMBERS_ADDED',
      ]),
    );
    expect(
      projectActions.find((entry) => entry.action === 'PROJECT_MEMBERS_ADDED')?.metadata,
    ).toMatchObject({ memberIds: [firstMember.id, secondMember.id], source: 'project-creation' });

    const createdTask = await request(app)
      .post(`/api/projects/${project.id}/tasks`)
      .set('Authorization', bearer(manager.token))
      .send({
        title: 'Audited assignment',
        dueDate: '2026-08-10',
        assigneeId: firstMember.id,
      })
      .expect(201);
    const taskId = createdTask.body.data.task.id as string;
    const taskActions = await AuditLogModel.find({ entityType: 'Task', entityId: taskId }).lean();
    expect(taskActions.map((entry) => entry.action)).toEqual(
      expect.arrayContaining(['TASK_CREATED', 'TASK_ASSIGNED']),
    );
    expect(taskActions.find((entry) => entry.action === 'TASK_ASSIGNED')?.metadata).toMatchObject({
      previousAssigneeId: null,
      assigneeId: firstMember.id,
      source: 'task-creation',
    });
  });
});

describe('attachment content validation', () => {
  it('rejects extension and content spoofing without leaving metadata or files behind', async () => {
    const admin = await createUser('admin@example.com', 'ADMIN');
    const manager = await createUser('manager@example.com', 'PROJECT_MANAGER');
    const member = await createUser('member@example.com');
    const project = await createProject(admin, manager.id, [member.id]);
    const createdTask = await request(app)
      .post(`/api/projects/${project.id}/tasks`)
      .set('Authorization', bearer(manager.token))
      .send({ title: 'Inspect upload', dueDate: '2026-08-10', assigneeId: member.id })
      .expect(201);
    const taskId = createdTask.body.data.task.id as string;
    const filesBefore = (await fs.readdir(env.uploadDirectory)).sort();

    const mismatchedExtension = await request(app)
      .post(`/api/tasks/${taskId}/attachments`)
      .set('Authorization', bearer(member.token))
      .attach('file', Buffer.from('%PDF-1.7\n'), {
        filename: 'payload.exe',
        contentType: 'application/pdf',
      })
      .expect(400);
    expect(mismatchedExtension.body.message).toBe(
      'Attachment extension does not match its declared file type.',
    );

    const spoofedContents = await request(app)
      .post(`/api/tasks/${taskId}/attachments`)
      .set('Authorization', bearer(member.token))
      .attach('file', Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]), {
        filename: 'payload.pdf',
        contentType: 'application/pdf',
      })
      .expect(400);
    expect(spoofedContents.body.message).toBe(
      'Attachment content does not match its declared file type.',
    );
    expect(await AttachmentModel.countDocuments({ taskId })).toBe(0);
    expect((await fs.readdir(env.uploadDirectory)).sort()).toEqual(filesBefore);
  });
});
