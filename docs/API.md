# CountryEdu NexaTask API guide

## Base URL and conventions

This guide describes the implemented REST contract. The generated OpenAPI document is served by
the same application and is the interactive reference for request and response schemas.

- Local API origin: `http://localhost:5000`
- API prefix: `/api`
- Swagger UI: `GET /api/docs`
- OpenAPI JSON: `GET /api/docs.json`
- Health: `GET /api/health`
- Content types: JSON for API envelopes, `multipart/form-data` for attachment upload, binary data
  for attachment download, and HTML for Swagger UI
- Dates: ISO 8601 strings in UTC
- Authentication: `Authorization: Bearer <accessToken>`

## Roles and resource scope

- `ADMIN`: organization-wide users, projects, tasks, dashboard, and audit access.
- `PROJECT_MANAGER`: assigned projects and their members/tasks/dashboard only.
- `TEAM_MEMBER`: member projects, accessible project tasks, their assigned work/status, comments, attachments, and relevant dashboard data.

Frontend route visibility is not authorization. The API must derive the current user from the JWT and recheck current activity, role, ownership, project membership, manager assignment, and task assignment as applicable.

## Response envelopes

Successful project response:

```json
{
  "success": true,
  "message": "Project created.",
  "data": {
    "project": {
      "id": "66a111111111111111111111"
    }
  }
}
```

Paginated response:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 0,
    "totalPages": 0,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

Error response:

```json
{
  "success": false,
  "message": "Project not found.",
  "errors": []
}
```

Validation errors may add safe field details to `errors`, for example:

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": [
    { "path": "deadline", "message": "Project deadline must be on or after the start date." }
  ]
}
```

No response may expose password hashes, JWTs other than the intentional login/register token result, stack traces, database internals, environment values, or server filesystem paths.

## Common status codes

| Code  | Meaning                                                    |
| ----- | ---------------------------------------------------------- |
| `200` | Successful read/update/delete with a JSON response         |
| `201` | Resource created                                           |
| `400` | Invalid body, query, ID, date range, transition, or upload |
| `401` | Missing, malformed, expired, or invalid JWT; invalid login |
| `403` | Authenticated but not allowed for the role/resource        |
| `404` | Resource or route not found                                |
| `409` | Duplicate email or another state conflict                  |
| `429` | Authentication rate limit exceeded                         |
| `500` | Unexpected safe production error                           |

## Pagination, search, filters, and sorting

List endpoints validate query input on the server:

- `page`: positive integer, default `1`.
- `limit`: positive integer with maximum `100`, default `20`.
- `search`: trimmed and safely escaped/bounded; never interpolated into arbitrary MongoDB syntax.
- `sortBy`: endpoint-specific allow-list only.
- `sortOrder`: `asc` or `desc`.
- Invalid enum/date/range/sort values return `400`.

The server performs filtering and pagination before returning results. A client should reset `page` to `1` when filters change.

## Route summary

### Platform

| Method and path   | Auth   | Purpose                         |
| ----------------- | ------ | ------------------------------- |
| `GET /api/health` | Public | Safe process/database readiness |
| `GET /api/docs`   | Public | Swagger/OpenAPI UI              |

### Authentication

| Method and path           | Auth                               | Request body                | Result                            |
| ------------------------- | ---------------------------------- | --------------------------- | --------------------------------- |
| `POST /api/auth/register` | Public, rate-limited as configured | `name`, `email`, `password` | `201`; safe user and access token |
| `POST /api/auth/login`    | Public, rate-limited               | `email`, `password`         | `200`; safe user and access token |
| `GET /api/auth/me`        | Any active user                    | —                           | `200`; current safe user          |

Registration:

```json
{
  "name": "Demo Member",
  "email": "member4@nexatask.demo",
  "password": "Demo@12345"
}
```

Registration normalizes the email and creates an active `TEAM_MEMBER`; clients cannot self-assign a privileged role. Login uses the same generic failure for unknown email, wrong password, and any other credential mismatch:

```json
{
  "success": false,
  "message": "Invalid email or password.",
  "errors": []
}
```

Inactive users cannot log in or continue to use protected routes. Successful registration and
login responses return the bearer token at `data.accessToken`; the Postman login script stores it
in the collection-level `accessToken` variable.

### Users (Admin only)

| Method and path                   | Query/body                                                           | Result               |
| --------------------------------- | -------------------------------------------------------------------- | -------------------- |
| `GET /api/users`                  | `page`, `limit`, `search`, `role`, `isActive`, `sortBy`, `sortOrder` | Paginated safe users |
| `GET /api/users/:userId`          | —                                                                    | Safe user detail     |
| `PATCH /api/users/:userId/role`   | `{ "role": "PROJECT_MANAGER" }`                                      | Updated safe user    |
| `PATCH /api/users/:userId/status` | `{ "isActive": false }`                                              | Updated safe user    |

Allowed user filters are `ADMIN`, `PROJECT_MANAGER`, `TEAM_MEMBER` and boolean `isActive`. Search
covers normalized name/email. Allowed sort fields are `name`, `email`, `role`, `isActive`, and
`createdAt`. Invalid roles return `400`. Self-deactivation requires
`{ "isActive": false, "confirmSelfDeactivation": true }` and is still blocked while the user owns
project or task responsibilities.

### Projects

| Method and path                                   | Access                    | Input/result                      |
| ------------------------------------------------- | ------------------------- | --------------------------------- |
| `POST /api/projects`                              | Admin                     | Create from project fields; `201` |
| `GET /api/projects`                               | Active user, role-scoped  | Paginated accessible projects     |
| `GET /api/projects/:projectId`                    | Accessible project        | Project detail                    |
| `PATCH /api/projects/:projectId`                  | Admin or assigned manager | Whitelisted project fields        |
| `DELETE /api/projects/:projectId`                 | Admin                     | Consistent delete result          |
| `PATCH /api/projects/:projectId/manager`          | Admin                     | Set manager with `{ managerId }`  |
| `POST /api/projects/:projectId/members`           | Admin or assigned manager | Add one/many members              |
| `DELETE /api/projects/:projectId/members/:userId` | Admin or assigned manager | Remove member                     |
| `GET /api/projects/:projectId/eligible-members`   | Admin or assigned manager | Paginated eligible Team Members   |

Create example:

```json
{
  "name": "Campus Content Refresh",
  "description": "Refresh program pages and admission guidance.",
  "status": "PLANNING",
  "managerId": "66a222222222222222222222",
  "memberIds": [],
  "startDate": "2026-08-04T00:00:00.000Z",
  "deadline": "2026-08-18T00:00:00.000Z"
}
```

Update accepts only appropriate mutable fields such as `name`, `description`, `status`, `startDate`, and `deadline`; manager and membership use their dedicated routes. `status` is one of `PLANNING`, `ACTIVE`, `ON_HOLD`, `COMPLETED`. Deadline cannot precede start date.

Manager assignment:

```json
{ "managerId": "66a222222222222222222222" }
```

The referenced manager must be active and have `ADMIN` or `PROJECT_MANAGER` role. Member addition accepts a batch-shaped body so duplicates can be normalized in one operation:

```json
{ "userIds": ["66a333333333333333333333"] }
```

Every referenced member must exist, be active, and have the `TEAM_MEMBER` role. The service
prevents duplicate membership.
The eligible-members route accepts `page`, `limit`, and `search`; it returns active
`TEAM_MEMBER` users who are not already assigned to the project.

Project list query:

```text
GET /api/projects?page=1&limit=10&search=campus&status=ACTIVE&managerId=66a222222222222222222222&deadlineFrom=2026-08-01T00:00:00.000Z&deadlineTo=2026-08-31T23:59:59.999Z&sortBy=deadline&sortOrder=asc
```

Project `sortBy` accepts `name`, `status`, `startDate`, `deadline`, `createdAt`, or `updatedAt`.
Search covers project name and description.

### Tasks

| Method and path                       | Access                                  | Input/result                  |
| ------------------------------------- | --------------------------------------- | ----------------------------- |
| `POST /api/projects/:projectId/tasks` | Admin or assigned manager               | Create task; `201`            |
| `GET /api/projects/:projectId/tasks`  | Accessible project                      | Paginated accessible tasks    |
| `GET /api/tasks/my-tasks`             | Active user                             | Current user's assigned tasks |
| `GET /api/tasks/:taskId`              | Accessible task                         | Task detail                   |
| `PATCH /api/tasks/:taskId`            | Admin or assigned manager               | Whitelisted task fields       |
| `DELETE /api/tasks/:taskId`           | Admin or assigned manager               | Delete task                   |
| `PATCH /api/tasks/:taskId/status`     | Admin/assigned manager, or own assignee | Change status                 |
| `PATCH /api/tasks/:taskId/assignee`   | Admin or assigned manager               | Assign/reassign member        |

Create example:

```json
{
  "title": "Review scholarship copy",
  "description": "Check dates and eligibility language.",
  "priority": "HIGH",
  "assigneeId": "66a333333333333333333333",
  "dueDate": "2026-08-10T12:00:00.000Z"
}
```

`status` defaults to `TODO` when omitted. The assignee is optional, but when provided must be an active member of the URL project. Generic task update accepts fields such as `title`, `description`, `priority`, and `dueDate`; status and assignee use dedicated endpoints so authorization/auditing remains clear.

Status request:

```json
{ "status": "IN_PROGRESS" }
```

Accepted statuses are `TODO`, `IN_PROGRESS`, and `COMPLETED`. Allowed changes are
`TODO -> IN_PROGRESS`, `IN_PROGRESS -> TODO|COMPLETED`, and `COMPLETED -> IN_PROGRESS`; submitting
the current status is an accepted no-op. Completion sets `completedAt`, while reopening clears it.
A Team Member may call this route only for their own assigned task. Invalid values or transitions
return `400`.

Assignee request:

```json
{ "assigneeId": "66a333333333333333333333" }
```

A nullable `assigneeId` unassigns the task. Team Members cannot call this route.

Project-task query parameters are `page`, `limit`, `search`, `status`, `priority`, `assigneeId`,
`dueFrom`, `dueTo`, `sortBy`, and `sortOrder`. Status values are as above; priorities are `LOW`,
`MEDIUM`, `HIGH`; allowed sort fields are `title`, `status`, `priority`, `dueDate`, `createdAt`, and
`updatedAt`. Search covers title and description. `my-tasks` accepts the same parameters except
`assigneeId`, because its assignee is always the authenticated user.

### Comments

| Method and path                    | Access                                       | Input/result               |
| ---------------------------------- | -------------------------------------------- | -------------------------- |
| `POST /api/tasks/:taskId/comments` | Accessible task                              | `{ "body": "..." }`; `201` |
| `GET /api/tasks/:taskId/comments`  | Accessible task                              | Ordered task comments      |
| `PATCH /api/comments/:commentId`   | Author                                       | Update own comment         |
| `DELETE /api/comments/:commentId`  | Author, Admin, or assigned manager moderator | Delete result              |

```json
{ "body": "The eligibility dates have been checked." }
```

The body is trimmed, non-empty after trimming, and length-limited. Admin may delete any comment. A Project Manager may moderate comments only inside an assigned project. A Team Member can edit/delete only their own comment. Every operation derives access through comment -> task -> project.

### Attachments

| Method and path                               | Access                                               | Input/result                           |
| --------------------------------------------- | ---------------------------------------------------- | -------------------------------------- |
| `POST /api/tasks/:taskId/attachments`         | Accessible task                                      | Multipart field `file`; `201` metadata |
| `GET /api/tasks/:taskId/attachments`          | Accessible task                                      | Attachment metadata list               |
| `GET /api/attachments/:attachmentId/download` | Accessible parent task                               | Original file bytes                    |
| `DELETE /api/attachments/:attachmentId`       | Uploader or project moderator per implemented policy | Delete metadata and physical file      |

Upload exactly one file using form-data key `file`. Maximum bytes come from `MAX_FILE_SIZE`.
Allowed types are PDF, PNG, JPG/JPEG, TXT, DOC, and DOCX; executables are rejected. Metadata
responses expose a protected application-relative download URL, never the absolute filesystem
path or internal stored name. The original filename is display-only and cannot determine storage
location. Download requires bearer authentication and rechecks access through attachment -> task ->
project.

### Dashboard

All dashboard routes require an active user and apply role visibility before aggregation.

| Method and path                       | Result                                                      |
| ------------------------------------- | ----------------------------------------------------------- |
| `GET /api/dashboard/overview`         | Project/task summary and completed-vs-pending/status series |
| `GET /api/dashboard/deadlines`        | Accessible project/task items due in the next seven days    |
| `GET /api/dashboard/project-progress` | Completed/total/progress for accessible projects            |
| `GET /api/dashboard/team-performance` | Understandable per-user assigned/completed/overdue metrics  |

Illustrative overview shape (values must come from MongoDB):

```json
{
  "success": true,
  "data": {
    "projects": { "total": 0, "active": 0, "completed": 0 },
    "tasks": {
      "total": 0,
      "todo": 0,
      "inProgress": 0,
      "completed": 0,
      "pending": 0,
      "overdue": 0
    },
    "completedVsPending": [
      { "name": "Completed", "value": 0 },
      { "name": "Pending", "value": 0 }
    ],
    "tasksByStatus": [
      { "status": "TODO", "count": 0 },
      { "status": "IN_PROGRESS", "count": 0 },
      { "status": "COMPLETED", "count": 0 }
    ]
  }
}
```

`pending` means tasks not in `COMPLETED`. Overdue excludes completed tasks. Project progress is `completedTaskCount / totalTaskCount * 100`, returning `0` for an empty project. Team performance fields are user name, assigned count, completed count, completion percentage, and overdue count—no synthetic productivity score.

### Audit logs (Admin only)

| Method and path       | Query/result                               |
| --------------------- | ------------------------------------------ |
| `GET /api/audit-logs` | Paginated, newest-first safe audit records |

Query parameters: `page`, `limit`, `actorId`, `action`, `entityType`, `dateFrom`, `dateTo`. The server allow-lists action/entity values, validates date ordering, and always sorts newest first. Logs cover required registration/login, user role/status, project/member/manager, task/assignment/status, and attachment events. They never contain passwords, JWTs, secrets, complete request bodies, or sensitive headers.

## Audit filter vocabulary

`entityType` accepts `User`, `Project`, `Task`, or `Attachment`. `action` accepts:

- `USER_REGISTERED`, `USER_LOGIN`, `USER_ROLE_CHANGED`, `USER_ACTIVATED`, `USER_DEACTIVATED`;
- `PROJECT_CREATED`, `PROJECT_UPDATED`, `PROJECT_DELETED`, `PROJECT_MANAGER_ASSIGNED`,
  `PROJECT_MEMBERS_ADDED`, `PROJECT_MEMBER_REMOVED`;
- `TASK_CREATED`, `TASK_UPDATED`, `TASK_DELETED`, `TASK_ASSIGNED`, `TASK_REASSIGNED`,
  `TASK_STATUS_CHANGED`;
- `ATTACHMENT_UPLOADED`, `ATTACHMENT_DELETED`.

When both dates are supplied, `dateTo` must be on or after `dateFrom`.

## Error behavior by boundary

- Invalid JSON/body/query/path ID: `400` with safe field errors.
- Duplicate normalized email: `409`.
- Generic login mismatch or disabled-login policy: generic `401` without account enumeration.
- Missing/invalid/expired bearer token: `401`.
- Valid user outside role/resource scope: `403`.
- Valid scoped request for a missing record: `404` (avoid leaking inaccessible record existence where policy requires `403`/`404` normalization).
- Multer size/type/count error: `400` with useful safe wording.
- Unexpected error: `500` with a generic production message and redacted server-side diagnostic.

## Postman workflow

Import
[`postman/CountryEdu-NexaTask.postman_collection.json`](./postman/CountryEdu-NexaTask.postman_collection.json).
After starting local MongoDB, the API, and freshly seeded demo data, execute the ordered,
non-destructive
smoke folder with:

```bash
npx newman run docs/postman/CountryEdu-NexaTask.postman_collection.json \
  --folder "Seeded Smoke Workflow"
```

The remaining folders are a complete route reference, not an end-to-end runner. For manual
mutation requests, run Login first to store `data.accessToken`, set the required ID variables, and
run destructive deletes last.

## OpenAPI coverage

Swagger at `/api/docs` documents the application REST operations, bearer authentication, roles,
request bodies, reusable response/error schemas, path/query parameters, multipart upload,
pagination, validation, `401`, and `403`. The machine-readable OpenAPI 3.0.3 document is available
at `/api/docs.json`; the documentation endpoints themselves are mounted by the application.
