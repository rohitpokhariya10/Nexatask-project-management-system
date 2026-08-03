# CountryEdu NexaTask database schema

CountryEdu NexaTask uses MongoDB with Mongoose. The schemas below describe the implemented
collections in `server/src/modules`; all references are MongoDB `ObjectId` values. API responses
serialize `_id` as `id` and never expose `passwordHash` or an attachment's internal `storedName`.

## Collections

### `users`

| Field          | Type    | Required | Default       | Rules                                      |
| -------------- | ------- | -------- | ------------- | ------------------------------------------ |
| `name`         | String  | Yes      | —             | Trimmed, maximum 100 characters            |
| `email`        | String  | Yes      | —             | Trimmed, lowercase, unique, maximum 254    |
| `passwordHash` | String  | Yes      | —             | Excluded from normal queries and responses |
| `role`         | Enum    | Yes      | `TEAM_MEMBER` | `ADMIN`, `PROJECT_MANAGER`, `TEAM_MEMBER`  |
| `avatarUrl`    | String  | No       | —             | Maximum 2048 characters                    |
| `isActive`     | Boolean | Yes      | `true`        | Inactive users cannot authenticate         |
| `createdAt`    | Date    | Yes      | Automatic     | Mongoose timestamp                         |
| `updatedAt`    | Date    | Yes      | Automatic     | Mongoose timestamp                         |

Indexes: unique `email`, plus single-field `role` and `isActive` indexes.

### `projects`

| Field         | Type       | Required | Default    | Rules                                         |
| ------------- | ---------- | -------- | ---------- | --------------------------------------------- |
| `name`        | String     | Yes      | —          | Trimmed, maximum 150 characters               |
| `description` | String     | No       | Empty text | Trimmed, maximum 3000 characters              |
| `status`      | Enum       | Yes      | `PLANNING` | `PLANNING`, `ACTIVE`, `ON_HOLD`, `COMPLETED`  |
| `managerId`   | ObjectId   | Yes      | —          | References an active Admin or Project Manager |
| `memberIds`   | ObjectId[] | Yes      | `[]`       | User references; duplicates are rejected      |
| `startDate`   | Date       | Yes      | —          | Must not be after `deadline`                  |
| `deadline`    | Date       | Yes      | —          | Must be on or after `startDate`               |
| `createdBy`   | ObjectId   | Yes      | —          | References `users`                            |
| `createdAt`   | Date       | Yes      | Automatic  | Mongoose timestamp                            |
| `updatedAt`   | Date       | Yes      | Automatic  | Mongoose timestamp                            |

Indexes: `status`, `managerId`, `memberIds`, `deadline`, and `name`.

### `tasks`

| Field         | Type     | Required | Default   | Rules                                       |
| ------------- | -------- | -------- | --------- | ------------------------------------------- |
| `projectId`   | ObjectId | Yes      | —         | References `projects`                       |
| `title`       | String   | Yes      | —         | Trimmed, maximum 200 characters             |
| `description` | String   | No       | Empty     | Trimmed, maximum 5000 characters            |
| `status`      | Enum     | Yes      | `TODO`    | `TODO`, `IN_PROGRESS`, `COMPLETED`          |
| `priority`    | Enum     | Yes      | `MEDIUM`  | `LOW`, `MEDIUM`, `HIGH`                     |
| `assigneeId`  | ObjectId | No       | `null`    | Active project member when assigned         |
| `createdBy`   | ObjectId | Yes      | —         | References `users`                          |
| `dueDate`     | Date     | Yes      | —         | Task deadline                               |
| `completedAt` | Date     | No       | `null`    | Set on completion and cleared when reopened |
| `createdAt`   | Date     | Yes      | Automatic | Mongoose timestamp                          |
| `updatedAt`   | Date     | Yes      | Automatic | Mongoose timestamp                          |

Indexes: `projectId`, `status`, `priority`, `assigneeId`, `dueDate`, `title`, plus compound
indexes `{ projectId, status }` and `{ projectId, dueDate }`.

### `comments`

| Field       | Type     | Required | Rules                            |
| ----------- | -------- | -------- | -------------------------------- |
| `taskId`    | ObjectId | Yes      | References `tasks`               |
| `authorId`  | ObjectId | Yes      | References `users`               |
| `body`      | String   | Yes      | Trimmed, maximum 3000 characters |
| `createdAt` | Date     | Yes      | Mongoose timestamp               |
| `updatedAt` | Date     | Yes      | Mongoose timestamp               |

Indexes: `taskId`, `authorId`, and compound `{ taskId, createdAt }`.

### `attachments`

| Field          | Type     | Required | Rules                                                |
| -------------- | -------- | -------- | ---------------------------------------------------- |
| `taskId`       | ObjectId | Yes      | References `tasks`                                   |
| `uploadedBy`   | ObjectId | Yes      | References `users`                                   |
| `originalName` | String   | Yes      | Display-only safe name, maximum 255 characters       |
| `storedName`   | String   | Yes      | Unique server-generated name; never returned by API  |
| `mimeType`     | String   | Yes      | Validated against extension and actual file contents |
| `size`         | Number   | Yes      | Non-negative accepted byte count                     |
| `relativeUrl`  | String   | Yes      | Authenticated download route                         |
| `createdAt`    | Date     | Yes      | Mongoose timestamp                                   |

Indexes: `taskId`, `uploadedBy`, and unique `storedName`.

### `auditlogs`

| Field        | Type     | Required | Rules                                 |
| ------------ | -------- | -------- | ------------------------------------- |
| `actorId`    | ObjectId | Yes      | References the acting `users` record  |
| `action`     | Enum     | Yes      | Server-controlled audit action        |
| `entityType` | Enum     | Yes      | Server-controlled entity category     |
| `entityId`   | ObjectId | Yes      | ID of the affected entity             |
| `summary`    | String   | Yes      | Safe summary, maximum 500 characters  |
| `metadata`   | Object   | Yes      | Sanitized identifiers/change metadata |
| `ipAddress`  | String   | No       | Request IP, maximum 100 characters    |
| `createdAt`  | Date     | Yes      | Immutable creation timestamp          |

Indexes: `actorId`, `action`, `entityType`, `entityId`, descending `createdAt`, and compound
`{ entityType, entityId }`.

Audit `action` values are `USER_REGISTERED`, `USER_LOGIN`, `USER_ROLE_CHANGED`,
`USER_ACTIVATED`, `USER_DEACTIVATED`, `PROJECT_CREATED`, `PROJECT_UPDATED`, `PROJECT_DELETED`,
`PROJECT_MANAGER_ASSIGNED`, `PROJECT_MEMBERS_ADDED`, `PROJECT_MEMBER_REMOVED`, `TASK_CREATED`,
`TASK_UPDATED`, `TASK_DELETED`, `TASK_ASSIGNED`, `TASK_REASSIGNED`, `TASK_STATUS_CHANGED`,
`ATTACHMENT_UPLOADED`, and `ATTACHMENT_DELETED`. Audit `entityType` values are `User`, `Project`,
`Task`, and `Attachment`. The shared constants are enforced by the write model, query validator,
and generated OpenAPI document.

## Relationships and lifecycle

- A User manages Projects through `managerId` and collaborates through `memberIds`.
- A Project contains Tasks. Deleting a project cascades through its tasks, comments, attachment
  metadata, and stored files.
- A Task contains Comments and Attachments. Deleting a task cleans up both child collections and
  physical attachments.
- User records are deactivated instead of deleted so ownership and audit references remain stable.
- Role changes and deactivation are blocked while a user still owns project or task responsibilities.

See [ERD.md](./ERD.md) for the Mermaid relationship diagram and the Mongoose model files for the
executable schema definitions.
