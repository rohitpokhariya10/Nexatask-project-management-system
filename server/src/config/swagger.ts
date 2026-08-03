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
const jsonBody = (schema: Record<string, unknown>) => ({
  required: true,
  content: { 'application/json': { schema } },
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
          success: { type: 'boolean', example: false },
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
        required: ['id', 'name', 'email', 'role', 'isActive'],
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
      Project: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED'] },
          managerId: { type: 'string' },
          memberIds: { type: 'array', items: { type: 'string' } },
          manager: { allOf: [{ $ref: '#/components/schemas/User' }], nullable: true },
          members: { type: 'array', items: { $ref: '#/components/schemas/User' } },
          startDate: { type: 'string', format: 'date-time' },
          deadline: { type: 'string', format: 'date-time' },
          createdBy: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Task: {
        type: 'object',
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
        },
      },
      Comment: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          taskId: { type: 'string' },
          authorId: { type: 'string' },
          body: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Attachment: {
        type: 'object',
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
        responses: { 200: { description: 'Health status' } },
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
          201: { description: 'User and accessToken' },
          409: { description: 'Email already registered' },
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
          200: { description: 'User and accessToken' },
          429: { description: 'Rate limit exceeded' },
          ...standardResponses,
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Read the authenticated user',
        security: bearerSecurity,
        responses: { 200: { description: 'Current user' }, ...standardResponses },
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
        responses: { 200: { description: 'Paginated users' }, ...standardResponses },
      },
    },
    '/users/{userId}': {
      get: {
        tags: ['Users'],
        summary: 'Read a user (Admin)',
        security: bearerSecurity,
        parameters: [idParameter('userId')],
        responses: { 200: { description: 'User' }, ...standardResponses },
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
        responses: { 200: { description: 'Updated user' }, ...standardResponses },
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
        responses: { 200: { description: 'Updated user' }, ...standardResponses },
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
        responses: { 200: { description: 'Paginated projects' }, ...standardResponses },
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
        responses: { 201: { description: 'Created project' }, ...standardResponses },
      },
    },
    '/projects/{projectId}': {
      get: {
        tags: ['Projects'],
        summary: 'Read a visible project',
        security: bearerSecurity,
        parameters: [idParameter('projectId')],
        responses: {
          200: { description: 'Project with manager and member summaries' },
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
        responses: { 200: { description: 'Updated project' }, ...standardResponses },
      },
      delete: {
        tags: ['Projects'],
        summary: 'Delete a project (Admin)',
        security: bearerSecurity,
        parameters: [idParameter('projectId')],
        responses: { 200: { description: 'Deleted' }, ...standardResponses },
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
        responses: { 200: { description: 'Updated project' }, ...standardResponses },
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
        responses: { 200: { description: 'Updated project' }, ...standardResponses },
      },
    },
    '/projects/{projectId}/members/{userId}': {
      delete: {
        tags: ['Projects'],
        summary: 'Remove a project member',
        security: bearerSecurity,
        parameters: [idParameter('projectId'), idParameter('userId')],
        responses: { 200: { description: 'Updated project' }, ...standardResponses },
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
        responses: { 200: { description: 'Paginated eligible users' }, ...standardResponses },
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
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'priority', in: 'query', schema: { type: 'string' } },
          { name: 'assigneeId', in: 'query', schema: { type: 'string' } },
          { name: 'dueFrom', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'dueTo', in: 'query', schema: { type: 'string', format: 'date-time' } },
        ],
        responses: { 200: { description: 'Paginated tasks' }, ...standardResponses },
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
        responses: { 201: { description: 'Created task' }, ...standardResponses },
      },
    },
    '/tasks/my-tasks': {
      get: {
        tags: ['Tasks'],
        summary: 'List tasks assigned to the current user',
        security: bearerSecurity,
        parameters: [...pagedParameters],
        responses: { 200: { description: 'Paginated tasks' }, ...standardResponses },
      },
    },
    '/tasks/{taskId}': {
      get: {
        tags: ['Tasks'],
        summary: 'Read an accessible task',
        security: bearerSecurity,
        parameters: [idParameter('taskId')],
        responses: { 200: { description: 'Task' }, ...standardResponses },
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
        responses: { 200: { description: 'Updated task' }, ...standardResponses },
      },
      delete: {
        tags: ['Tasks'],
        summary: 'Delete a task in an assigned project',
        security: bearerSecurity,
        parameters: [idParameter('taskId')],
        responses: { 200: { description: 'Deleted' }, ...standardResponses },
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
        responses: { 200: { description: 'Updated task' }, ...standardResponses },
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
        responses: { 200: { description: 'Updated task' }, ...standardResponses },
      },
    },
    '/tasks/{taskId}/comments': {
      get: {
        tags: ['Comments'],
        summary: 'List comments for an accessible task',
        security: bearerSecurity,
        parameters: [idParameter('taskId'), ...pagedParameters],
        responses: { 200: { description: 'Paginated comments' }, ...standardResponses },
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
        responses: { 201: { description: 'Created comment' }, ...standardResponses },
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
        responses: { 200: { description: 'Updated comment' }, ...standardResponses },
      },
      delete: {
        tags: ['Comments'],
        summary: 'Delete an owned or moderatable comment',
        security: bearerSecurity,
        parameters: [idParameter('commentId')],
        responses: { 200: { description: 'Deleted' }, ...standardResponses },
      },
    },
    '/tasks/{taskId}/attachments': {
      get: {
        tags: ['Attachments'],
        summary: 'List task attachments',
        security: bearerSecurity,
        parameters: [idParameter('taskId')],
        responses: { 200: { description: 'Attachments' }, ...standardResponses },
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
        responses: { 201: { description: 'Uploaded attachment' }, ...standardResponses },
      },
    },
    '/attachments/{attachmentId}': {
      delete: {
        tags: ['Attachments'],
        summary: 'Delete an owned or moderatable attachment',
        security: bearerSecurity,
        parameters: [idParameter('attachmentId')],
        responses: { 200: { description: 'Deleted' }, ...standardResponses },
      },
    },
    '/attachments/{attachmentId}/download': {
      get: {
        tags: ['Attachments'],
        summary: 'Download an accessible attachment',
        security: bearerSecurity,
        parameters: [idParameter('attachmentId')],
        responses: { 200: { description: 'Attachment bytes' }, ...standardResponses },
      },
    },
    '/dashboard/overview': {
      get: {
        tags: ['Dashboard'],
        summary: 'Role-scoped overview aggregations',
        security: bearerSecurity,
        responses: { 200: { description: 'Project and task metrics' }, ...standardResponses },
      },
    },
    '/dashboard/deadlines': {
      get: {
        tags: ['Dashboard'],
        summary: 'Deadlines in the next seven days',
        security: bearerSecurity,
        responses: { 200: { description: 'Project and task deadlines' }, ...standardResponses },
      },
    },
    '/dashboard/project-progress': {
      get: {
        tags: ['Dashboard'],
        summary: 'Role-scoped project completion percentages',
        security: bearerSecurity,
        responses: { 200: { description: 'Project progress' }, ...standardResponses },
      },
    },
    '/dashboard/team-performance': {
      get: {
        tags: ['Dashboard'],
        summary: 'Understandable assignee completion metrics',
        security: bearerSecurity,
        responses: { 200: { description: 'Team performance' }, ...standardResponses },
      },
    },
    '/audit-logs': {
      get: {
        tags: ['Audit'],
        summary: 'List audit logs (Admin)',
        security: bearerSecurity,
        parameters: [
          ...pagedParameters,
          { name: 'actorId', in: 'query', schema: { type: 'string' } },
          { name: 'action', in: 'query', schema: { type: 'string' } },
          { name: 'entityType', in: 'query', schema: { type: 'string' } },
          { name: 'dateFrom', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'dateTo', in: 'query', schema: { type: 'string', format: 'date-time' } },
        ],
        responses: {
          200: { description: 'Newest-first paginated audit logs' },
          ...standardResponses,
        },
      },
    },
  },
};
