const bearerSecurity = [{ bearerAuth: [] }];
const idParameter = (name: string) => ({
  name,
  in: 'path',
  required: true,
  schema: { type: 'string' },
});
const pagedParameters = [
  { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
  {
    name: 'limit',
    in: 'query',
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
  },
];
const taskFilterParameters = [
  { name: 'search', in: 'query', schema: { type: 'string', maxLength: 200 } },
  {
    name: 'status',
    in: 'query',
    schema: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'COMPLETED'] },
  },
  {
    name: 'priority',
    in: 'query',
    schema: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
  },
  { name: 'dueFrom', in: 'query', schema: { type: 'string', format: 'date-time' } },
  { name: 'dueTo', in: 'query', schema: { type: 'string', format: 'date-time' } },
  {
    name: 'sortBy',
    in: 'query',
    schema: {
      type: 'string',
      enum: ['title', 'status', 'priority', 'dueDate', 'createdAt', 'updatedAt'],
      default: 'createdAt',
    },
  },
  {
    name: 'sortOrder',
    in: 'query',
    schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
  },
];
const jsonBody = (schema: Record<string, unknown>) => ({
  required: true,
  content: { 'application/json': { schema } },
});
const jsonResponse = (description: string, schemaName: string) => ({
  description,
  content: {
    'application/json': { schema: { $ref: `#/components/schemas/${schemaName}` } },
  },
});
const dataResponseSchema = (dataSchema: Record<string, unknown>) => ({
  allOf: [
    { $ref: '#/components/schemas/SuccessResponse' },
    { type: 'object', properties: { data: dataSchema } },
  ],
});
const paginatedDataResponseSchema = (dataSchema: Record<string, unknown>) => ({
  allOf: [
    { $ref: '#/components/schemas/PaginatedSuccessResponse' },
    { type: 'object', properties: { data: dataSchema } },
  ],
});
const standardResponses = {
  400: { $ref: '#/components/responses/ValidationError' },
  401: { $ref: '#/components/responses/AuthenticationError' },
  403: { $ref: '#/components/responses/AuthorizationError' },
};

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'CountryEdu NexaTask API',
    version: '1.0.0',
    description:
      'REST API for organization projects, task collaboration, dashboard analytics, attachments, and role-based administration. Roles are ADMIN, PROJECT_MANAGER, and TEAM_MEMBER.',
  },
  servers: [{ url: '/api', description: 'Current server' }],
  tags: [
    { name: 'Health' },
    { name: 'Authentication' },
    { name: 'Users' },
    { name: 'Projects' },
    { name: 'Tasks' },
    { name: 'Comments' },
    { name: 'Attachments' },
    { name: 'Dashboard' },
    { name: 'Audit' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      ErrorDetail: {
        type: 'object',
        required: ['message'],
        properties: { path: { type: 'string' }, message: { type: 'string' } },
      },
      ErrorResponse: {
        type: 'object',
        required: ['success', 'message', 'errors'],
        properties: {
          success: { type: 'boolean', enum: [false] },
          message: { type: 'string' },
          errors: { type: 'array', items: { $ref: '#/components/schemas/ErrorDetail' } },
        },
      },
      Pagination: {
        type: 'object',
        required: ['page', 'limit', 'totalItems', 'totalPages', 'hasNextPage', 'hasPreviousPage'],
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          totalItems: { type: 'integer' },
          totalPages: { type: 'integer' },
          hasNextPage: { type: 'boolean' },
          hasPreviousPage: { type: 'boolean' },
        },
      },
      User: {
        type: 'object',
        required: ['id', 'name', 'email', 'role', 'isActive', 'createdAt', 'updatedAt'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER'] },
          avatarUrl: { type: 'string', nullable: true },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      UserSummary: {
        type: 'object',
        required: ['id', 'name', 'email', 'role', 'avatarUrl', 'isActive'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER'] },
          avatarUrl: { type: 'string', nullable: true },
          isActive: { type: 'boolean' },
        },
      },
      Project: {
        type: 'object',
        required: [
          'id',
          'name',
          'description',
          'status',
          'managerId',
          'memberIds',
          'startDate',
          'deadline',
          'createdBy',
          'createdAt',
          'updatedAt',
        ],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED'] },
          managerId: { type: 'string' },
          memberIds: { type: 'array', items: { type: 'string' } },
          manager: { allOf: [{ $ref: '#/components/schemas/UserSummary' }], nullable: true },
          members: { type: 'array', items: { $ref: '#/components/schemas/UserSummary' } },
          startDate: { type: 'string', format: 'date-time' },
          deadline: { type: 'string', format: 'date-time' },
          createdBy: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Task: {
        type: 'object',
        required: [
          'id',
          'projectId',
          'title',
          'description',
          'status',
          'priority',
          'assigneeId',
          'createdBy',
          'dueDate',
          'completedAt',
          'createdAt',
          'updatedAt',
        ],
        properties: {
          id: { type: 'string' },
          projectId: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'COMPLETED'] },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
          assigneeId: { type: 'string', nullable: true },
          createdBy: { type: 'string' },
          dueDate: { type: 'string', format: 'date-time' },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Comment: {
        type: 'object',
        required: ['id', 'taskId', 'authorId', 'body', 'createdAt', 'updatedAt'],
        properties: {
          id: { type: 'string' },
          taskId: { type: 'string' },
          authorId: { type: 'string' },
          body: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Attachment: {
        type: 'object',
        required: [
          'id',
          'taskId',
          'uploadedBy',
          'originalName',
          'mimeType',
          'size',
          'relativeUrl',
          'createdAt',
        ],
        properties: {
          id: { type: 'string' },
          taskId: { type: 'string' },
          uploadedBy: { type: 'string' },
          originalName: { type: 'string' },
          mimeType: { type: 'string' },
          size: { type: 'integer' },
          relativeUrl: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      SuccessResponse: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean', enum: [true] },
          message: { type: 'string' },
          data: { description: 'Endpoint-specific response data.' },
        },
      },
      PaginatedSuccessResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            required: ['pagination'],
            properties: { pagination: { $ref: '#/components/schemas/Pagination' } },
          },
        ],
      },
      AuthResponse: dataResponseSchema({
        type: 'object',
        required: ['user', 'accessToken'],
        properties: {
          user: { $ref: '#/components/schemas/User' },
          accessToken: { type: 'string', description: 'JWT bearer access token.' },
        },
      }),
      UserResponse: dataResponseSchema({
        type: 'object',
        required: ['user'],
        properties: { user: { $ref: '#/components/schemas/User' } },
      }),
      ProjectResponse: dataResponseSchema({
        type: 'object',
        required: ['project'],
        properties: { project: { $ref: '#/components/schemas/Project' } },
      }),
      TaskResponse: dataResponseSchema({
        type: 'object',
        required: ['task'],
        properties: { task: { $ref: '#/components/schemas/Task' } },
      }),
      CommentResponse: dataResponseSchema({
        type: 'object',
        required: ['comment'],
        properties: { comment: { $ref: '#/components/schemas/Comment' } },
      }),
      AttachmentResponse: dataResponseSchema({
        type: 'object',
        required: ['attachment'],
        properties: { attachment: { $ref: '#/components/schemas/Attachment' } },
      }),
      PaginatedUsersResponse: paginatedDataResponseSchema({
        type: 'array',
        items: { $ref: '#/components/schemas/User' },
      }),
      PaginatedProjectsResponse: paginatedDataResponseSchema({
        type: 'array',
        items: { $ref: '#/components/schemas/Project' },
      }),
      PaginatedTasksResponse: paginatedDataResponseSchema({
        type: 'array',
        items: { $ref: '#/components/schemas/Task' },
      }),
      PaginatedCommentsResponse: paginatedDataResponseSchema({
        type: 'array',
        items: { $ref: '#/components/schemas/Comment' },
      }),
      AttachmentsResponse: dataResponseSchema({
        type: 'array',
        items: { $ref: '#/components/schemas/Attachment' },
      }),
      EmptySuccessResponse: dataResponseSchema({
        type: 'object',
        nullable: true,
        example: null,
      }),
      HealthStatus: {
        type: 'object',
        required: ['status', 'database', 'uptimeSeconds', 'timestamp'],
        properties: {
          status: { type: 'string', enum: ['ok', 'degraded'] },
          database: {
            type: 'string',
            enum: ['connected', 'connecting', 'disconnected'],
          },
          uptimeSeconds: { type: 'integer', minimum: 0 },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      HealthResponse: dataResponseSchema({ $ref: '#/components/schemas/HealthStatus' }),
      AuditLog: {
        type: 'object',
        required: [
          'id',
          'actorId',
          'action',
          'entityType',
          'entityId',
          'summary',
          'metadata',
          'createdAt',
        ],
        properties: {
          id: { type: 'string' },
          actorId: { type: 'string' },
          action: { type: 'string' },
          entityType: { type: 'string' },
          entityId: { type: 'string' },
          summary: { type: 'string' },
          metadata: { type: 'object', additionalProperties: true },
          ipAddress: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      PaginatedAuditLogsResponse: paginatedDataResponseSchema({
        type: 'array',
        items: { $ref: '#/components/schemas/AuditLog' },
      }),
      DashboardOverview: {
        type: 'object',
        required: ['projects', 'tasks', 'completedVsPending', 'tasksByStatus'],
        properties: {
          projects: {
            type: 'object',
            required: ['total', 'active', 'completed'],
            properties: {
              total: { type: 'integer', minimum: 0 },
              active: { type: 'integer', minimum: 0 },
              completed: { type: 'integer', minimum: 0 },
            },
          },
          tasks: {
            type: 'object',
            required: ['total', 'todo', 'inProgress', 'completed', 'pending', 'overdue'],
            properties: {
              total: { type: 'integer', minimum: 0 },
              todo: { type: 'integer', minimum: 0 },
              inProgress: { type: 'integer', minimum: 0 },
              completed: { type: 'integer', minimum: 0 },
              pending: { type: 'integer', minimum: 0 },
              overdue: { type: 'integer', minimum: 0 },
            },
          },
          completedVsPending: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name', 'value'],
              properties: {
                name: { type: 'string', enum: ['Completed', 'Pending'] },
                value: { type: 'integer', minimum: 0 },
              },
            },
          },
          tasksByStatus: {
            type: 'array',
            items: {
              type: 'object',
              required: ['status', 'count'],
              properties: {
                status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'COMPLETED'] },
                count: { type: 'integer', minimum: 0 },
              },
            },
          },
        },
      },
      DashboardOverviewResponse: dataResponseSchema({
        $ref: '#/components/schemas/DashboardOverview',
      }),
      Deadline: {
        type: 'object',
        required: ['type', 'id', 'title', 'deadline', 'status', 'projectId'],
        properties: {
          type: { type: 'string', enum: ['PROJECT', 'TASK'] },
          id: { type: 'string' },
          title: { type: 'string' },
          deadline: { type: 'string', format: 'date-time' },
          status: {
            type: 'string',
            enum: ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'TODO', 'IN_PROGRESS'],
          },
          projectId: { type: 'string' },
        },
      },
      DeadlinesResponse: dataResponseSchema({
        type: 'array',
        items: { $ref: '#/components/schemas/Deadline' },
      }),
      ProjectProgress: {
        type: 'object',
        required: ['projectId', 'name', 'status', 'totalTasks', 'completedTasks', 'progress'],
        properties: {
          projectId: { type: 'string' },
          name: { type: 'string' },
          status: {
            type: 'string',
            enum: ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED'],
          },
          totalTasks: { type: 'integer', minimum: 0 },
          completedTasks: { type: 'integer', minimum: 0 },
          progress: { type: 'integer', minimum: 0, maximum: 100 },
        },
      },
      ProjectProgressResponse: dataResponseSchema({
        type: 'array',
        items: { $ref: '#/components/schemas/ProjectProgress' },
      }),
      TeamPerformance: {
        type: 'object',
        required: [
          'userId',
          'name',
          'assignedTaskCount',
          'completedTaskCount',
          'overdueTaskCount',
          'completionPercentage',
        ],
        properties: {
          userId: { type: 'string' },
          name: { type: 'string' },
          assignedTaskCount: { type: 'integer', minimum: 0 },
          completedTaskCount: { type: 'integer', minimum: 0 },
          overdueTaskCount: { type: 'integer', minimum: 0 },
          completionPercentage: { type: 'number', minimum: 0, maximum: 100 },
        },
      },
      TeamPerformanceResponse: dataResponseSchema({
        type: 'array',
        items: { $ref: '#/components/schemas/TeamPerformance' },
      }),
    },
    responses: {
      ValidationError: {
        description: 'Input validation failed.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      AuthenticationError: {
        description: 'A valid bearer token is required.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      AuthorizationError: {
        description: 'The authenticated role or project membership is insufficient.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Read application and database health',
        responses: {
          200: jsonResponse('Application and database are healthy.', 'HealthResponse'),
          503: jsonResponse('Database is not connected.', 'HealthResponse'),
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a Team Member account',
        requestBody: jsonBody({
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
          },
        }),
        responses: {
          201: jsonResponse('Registered user and access token.', 'AuthResponse'),
          409: jsonResponse('Email is already registered.', 'ErrorResponse'),
          ...standardResponses,
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Log in',
        requestBody: jsonBody({
          type: 'object',
          required: ['email', 'password'],
          properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } },
        }),
        responses: {
          200: jsonResponse('Authenticated user and access token.', 'AuthResponse'),
          429: jsonResponse('Rate limit exceeded.', 'ErrorResponse'),
          ...standardResponses,
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Read the authenticated user',
        security: bearerSecurity,
        responses: { 200: jsonResponse('Current user.', 'UserResponse'), ...standardResponses },
      },
    },
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'List users (Admin)',
        security: bearerSecurity,
        parameters: [
          ...pagedParameters,
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'role', in: 'query', schema: { type: 'string' } },
          { name: 'isActive', in: 'query', schema: { type: 'boolean' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string' } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
        ],
        responses: {
          200: jsonResponse('Paginated users.', 'PaginatedUsersResponse'),
          ...standardResponses,
        },
      },
    },
    '/users/{userId}': {
      get: {
        tags: ['Users'],
        summary: 'Read a user (Admin)',
        security: bearerSecurity,
        parameters: [idParameter('userId')],
        responses: { 200: jsonResponse('User.', 'UserResponse'), ...standardResponses },
      },
    },
    '/users/{userId}/role': {
      patch: {
        tags: ['Users'],
        summary: 'Change a user role (Admin)',
        security: bearerSecurity,
        parameters: [idParameter('userId')],
        requestBody: jsonBody({
          type: 'object',
          required: ['role'],
          properties: {
            role: { type: 'string', enum: ['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER'] },
          },
        }),
        responses: { 200: jsonResponse('Updated user.', 'UserResponse'), ...standardResponses },
      },
    },
    '/users/{userId}/status': {
      patch: {
        tags: ['Users'],
        summary: 'Activate or deactivate a user (Admin)',
        security: bearerSecurity,
        parameters: [idParameter('userId')],
        requestBody: jsonBody({
          type: 'object',
          required: ['isActive'],
          properties: {
            isActive: { type: 'boolean' },
            confirmSelfDeactivation: { type: 'boolean' },
          },
        }),
        responses: { 200: jsonResponse('Updated user.', 'UserResponse'), ...standardResponses },
      },
    },
    '/projects': {
      get: {
        tags: ['Projects'],
        summary: 'List visible projects',
        security: bearerSecurity,
        parameters: [
          ...pagedParameters,
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'managerId', in: 'query', schema: { type: 'string' } },
          { name: 'deadlineFrom', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'deadlineTo', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string' } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
        ],
        responses: {
          200: jsonResponse('Paginated projects.', 'PaginatedProjectsResponse'),
          ...standardResponses,
        },
      },
      post: {
        tags: ['Projects'],
        summary: 'Create a project (Admin)',
        security: bearerSecurity,
        requestBody: jsonBody({
          type: 'object',
          required: ['name', 'managerId', 'startDate', 'deadline'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string' },
            managerId: { type: 'string' },
            memberIds: { type: 'array', items: { type: 'string' } },
            startDate: { type: 'string', format: 'date-time' },
            deadline: { type: 'string', format: 'date-time' },
          },
        }),
        responses: {
          201: jsonResponse('Created project.', 'ProjectResponse'),
          ...standardResponses,
        },
      },
    },
    '/projects/{projectId}': {
      get: {
        tags: ['Projects'],
        summary: 'Read a visible project',
        security: bearerSecurity,
        parameters: [idParameter('projectId')],
        responses: {
          200: jsonResponse('Project with manager and member summaries.', 'ProjectResponse'),
          ...standardResponses,
        },
      },
      patch: {
        tags: ['Projects'],
        summary: 'Update an assigned project',
        security: bearerSecurity,
        parameters: [idParameter('projectId')],
        requestBody: jsonBody({
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string' },
            startDate: { type: 'string', format: 'date-time' },
            deadline: { type: 'string', format: 'date-time' },
          },
        }),
        responses: {
          200: jsonResponse('Updated project.', 'ProjectResponse'),
          ...standardResponses,
        },
      },
      delete: {
        tags: ['Projects'],
        summary: 'Delete a project (Admin)',
        security: bearerSecurity,
        parameters: [idParameter('projectId')],
        responses: {
          200: jsonResponse('Project deleted.', 'EmptySuccessResponse'),
          ...standardResponses,
        },
      },
    },
    '/projects/{projectId}/manager': {
      patch: {
        tags: ['Projects'],
        summary: 'Assign Project Manager (Admin)',
        security: bearerSecurity,
        parameters: [idParameter('projectId')],
        requestBody: jsonBody({
          type: 'object',
          required: ['managerId'],
          properties: { managerId: { type: 'string' } },
        }),
        responses: {
          200: jsonResponse('Updated project.', 'ProjectResponse'),
          ...standardResponses,
        },
      },
    },
    '/projects/{projectId}/members': {
      post: {
        tags: ['Projects'],
        summary: 'Add active Team Members',
        security: bearerSecurity,
        parameters: [idParameter('projectId')],
        requestBody: jsonBody({
          type: 'object',
          properties: {
            userId: { type: 'string' },
            userIds: { type: 'array', items: { type: 'string' } },
          },
        }),
        responses: {
          200: jsonResponse('Updated project.', 'ProjectResponse'),
          ...standardResponses,
        },
      },
    },
    '/projects/{projectId}/members/{userId}': {
      delete: {
        tags: ['Projects'],
        summary: 'Remove a project member',
        security: bearerSecurity,
        parameters: [idParameter('projectId'), idParameter('userId')],
        responses: {
          200: jsonResponse('Updated project.', 'ProjectResponse'),
          ...standardResponses,
        },
      },
    },
    '/projects/{projectId}/eligible-members': {
      get: {
        tags: ['Projects'],
        summary: 'List eligible active Team Members for an assigned project',
        security: bearerSecurity,
        parameters: [
          idParameter('projectId'),
          ...pagedParameters,
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: jsonResponse('Paginated eligible users.', 'PaginatedUsersResponse'),
          ...standardResponses,
        },
      },
    },
    '/projects/{projectId}/tasks': {
      get: {
        tags: ['Tasks'],
        summary: 'List tasks in a visible project',
        security: bearerSecurity,
        parameters: [
          idParameter('projectId'),
          ...pagedParameters,
          ...taskFilterParameters.slice(0, 3),
          { name: 'assigneeId', in: 'query', schema: { type: 'string' } },
          ...taskFilterParameters.slice(3),
        ],
        responses: {
          200: jsonResponse('Paginated project tasks.', 'PaginatedTasksResponse'),
          ...standardResponses,
        },
      },
      post: {
        tags: ['Tasks'],
        summary: 'Create a task in an assigned project',
        security: bearerSecurity,
        parameters: [idParameter('projectId')],
        requestBody: jsonBody({
          type: 'object',
          required: ['title', 'dueDate'],
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
            assigneeId: { type: 'string', nullable: true },
            dueDate: { type: 'string', format: 'date-time' },
          },
        }),
        responses: { 201: jsonResponse('Created task.', 'TaskResponse'), ...standardResponses },
      },
    },
    '/tasks/my-tasks': {
      get: {
        tags: ['Tasks'],
        summary: 'List tasks assigned to the current user',
        description:
          'Returns only tasks assigned to the authenticated user within projects visible to that user.',
        security: bearerSecurity,
        parameters: [...pagedParameters, ...taskFilterParameters],
        responses: {
          200: jsonResponse('Paginated assigned tasks.', 'PaginatedTasksResponse'),
          ...standardResponses,
        },
      },
    },
    '/tasks/{taskId}': {
      get: {
        tags: ['Tasks'],
        summary: 'Read an accessible task',
        security: bearerSecurity,
        parameters: [idParameter('taskId')],
        responses: { 200: jsonResponse('Task.', 'TaskResponse'), ...standardResponses },
      },
      patch: {
        tags: ['Tasks'],
        summary: 'Update a task in an assigned project',
        security: bearerSecurity,
        parameters: [idParameter('taskId')],
        requestBody: jsonBody({
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            priority: { type: 'string' },
            dueDate: { type: 'string', format: 'date-time' },
          },
        }),
        responses: { 200: jsonResponse('Updated task.', 'TaskResponse'), ...standardResponses },
      },
      delete: {
        tags: ['Tasks'],
        summary: 'Delete a task in an assigned project',
        security: bearerSecurity,
        parameters: [idParameter('taskId')],
        responses: {
          200: jsonResponse('Task deleted.', 'EmptySuccessResponse'),
          ...standardResponses,
        },
      },
    },
    '/tasks/{taskId}/status': {
      patch: {
        tags: ['Tasks'],
        summary: 'Apply a valid task status transition',
        security: bearerSecurity,
        parameters: [idParameter('taskId')],
        requestBody: jsonBody({
          type: 'object',
          required: ['status'],
          properties: { status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'COMPLETED'] } },
        }),
        responses: { 200: jsonResponse('Updated task.', 'TaskResponse'), ...standardResponses },
      },
    },
    '/tasks/{taskId}/assignee': {
      patch: {
        tags: ['Tasks'],
        summary: 'Assign or unassign a project member',
        security: bearerSecurity,
        parameters: [idParameter('taskId')],
        requestBody: jsonBody({
          type: 'object',
          required: ['assigneeId'],
          properties: { assigneeId: { type: 'string', nullable: true } },
        }),
        responses: { 200: jsonResponse('Updated task.', 'TaskResponse'), ...standardResponses },
      },
    },
    '/tasks/{taskId}/comments': {
      get: {
        tags: ['Comments'],
        summary: 'List comments for an accessible task',
        security: bearerSecurity,
        parameters: [idParameter('taskId'), ...pagedParameters],
        responses: {
          200: jsonResponse('Paginated comments.', 'PaginatedCommentsResponse'),
          ...standardResponses,
        },
      },
      post: {
        tags: ['Comments'],
        summary: 'Add a task comment',
        security: bearerSecurity,
        parameters: [idParameter('taskId')],
        requestBody: jsonBody({
          type: 'object',
          required: ['body'],
          properties: { body: { type: 'string', maxLength: 3000 } },
        }),
        responses: {
          201: jsonResponse('Created comment.', 'CommentResponse'),
          ...standardResponses,
        },
      },
    },
    '/comments/{commentId}': {
      patch: {
        tags: ['Comments'],
        summary: 'Edit an owned comment',
        security: bearerSecurity,
        parameters: [idParameter('commentId')],
        requestBody: jsonBody({
          type: 'object',
          required: ['body'],
          properties: { body: { type: 'string' } },
        }),
        responses: {
          200: jsonResponse('Updated comment.', 'CommentResponse'),
          ...standardResponses,
        },
      },
      delete: {
        tags: ['Comments'],
        summary: 'Delete an owned or moderatable comment',
        security: bearerSecurity,
        parameters: [idParameter('commentId')],
        responses: {
          200: jsonResponse('Comment deleted.', 'EmptySuccessResponse'),
          ...standardResponses,
        },
      },
    },
    '/tasks/{taskId}/attachments': {
      get: {
        tags: ['Attachments'],
        summary: 'List task attachments',
        security: bearerSecurity,
        parameters: [idParameter('taskId')],
        responses: {
          200: jsonResponse('Task attachments.', 'AttachmentsResponse'),
          ...standardResponses,
        },
      },
      post: {
        tags: ['Attachments'],
        summary: 'Upload one allowed attachment',
        security: bearerSecurity,
        parameters: [idParameter('taskId')],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: { file: { type: 'string', format: 'binary' } },
              },
            },
          },
        },
        responses: {
          201: jsonResponse('Uploaded attachment.', 'AttachmentResponse'),
          ...standardResponses,
        },
      },
    },
    '/attachments/{attachmentId}': {
      delete: {
        tags: ['Attachments'],
        summary: 'Delete an owned or moderatable attachment',
        security: bearerSecurity,
        parameters: [idParameter('attachmentId')],
        responses: {
          200: jsonResponse('Attachment deleted.', 'EmptySuccessResponse'),
          ...standardResponses,
        },
      },
    },
    '/attachments/{attachmentId}/download': {
      get: {
        tags: ['Attachments'],
        summary: 'Download an accessible attachment',
        security: bearerSecurity,
        parameters: [idParameter('attachmentId')],
        responses: {
          200: {
            description: 'Attachment bytes.',
            content: {
              'application/octet-stream': { schema: { type: 'string', format: 'binary' } },
            },
          },
          ...standardResponses,
        },
      },
    },
    '/dashboard/overview': {
      get: {
        tags: ['Dashboard'],
        summary: 'Role-scoped overview aggregations',
        security: bearerSecurity,
        responses: {
          200: jsonResponse('Project and task metrics.', 'DashboardOverviewResponse'),
          ...standardResponses,
        },
      },
    },
    '/dashboard/deadlines': {
      get: {
        tags: ['Dashboard'],
        summary: 'Deadlines in the next seven days',
        security: bearerSecurity,
        responses: {
          200: jsonResponse('Project and task deadlines.', 'DeadlinesResponse'),
          ...standardResponses,
        },
      },
    },
    '/dashboard/project-progress': {
      get: {
        tags: ['Dashboard'],
        summary: 'Role-scoped project completion percentages',
        security: bearerSecurity,
        responses: {
          200: jsonResponse('Project progress.', 'ProjectProgressResponse'),
          ...standardResponses,
        },
      },
    },
    '/dashboard/team-performance': {
      get: {
        tags: ['Dashboard'],
        summary: 'Understandable assignee completion metrics',
        security: bearerSecurity,
        responses: {
          200: jsonResponse('Team performance.', 'TeamPerformanceResponse'),
          ...standardResponses,
        },
      },
    },
    '/audit-logs': {
      get: {
        tags: ['Audit'],
        summary: 'List audit logs (Admin)',
        description: 'Returns matching audit logs ordered newest first.',
        security: bearerSecurity,
        parameters: [
          ...pagedParameters,
          { name: 'actorId', in: 'query', schema: { type: 'string' } },
          { name: 'action', in: 'query', schema: { type: 'string', maxLength: 100 } },
          { name: 'entityType', in: 'query', schema: { type: 'string', maxLength: 80 } },
          { name: 'dateFrom', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'dateTo', in: 'query', schema: { type: 'string', format: 'date-time' } },
        ],
        responses: {
          200: jsonResponse('Newest-first paginated audit logs.', 'PaginatedAuditLogsResponse'),
          ...standardResponses,
        },
      },
    },
  },
};
