# CountryEdu NexaTask implementation checklist

This file preserves the original pre-implementation requirement inventory, so its row statuses are
an archived baseline rather than the current project state. Use the executed
[final QA record](./FINAL_QA.md) and [deliverables index](./DELIVERABLES.md) for current evidence.

## Status rules

- `PENDING` means the requirement has not yet been demonstrated with code and evidence.
- `IN PROGRESS` means implementation has started but the definition of done is not met.
- `BLOCKED` means a named external dependency prevents progress; record the reason and owner.
- `DONE` means the implementation exists and the relevant lint, type, test, and build checks pass.
- A file being present is not sufficient evidence for `DONE`.
- Record commands, test names, screenshots, commits, or URLs in the Evidence column before changing a row to `DONE`.
- Final end-to-end results belong in [FINAL_QA.md](./FINAL_QA.md), whose status vocabulary is deliberately stricter.

Archived initial state: all application work was `PENDING` before implementation began.

## 1. Repository and tooling

| Requirement                                                                                                                       | Status  | Evidence / notes                      |
| --------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------- |
| Work is performed only on `main`, with unrelated user changes preserved                                                           | PENDING | Verify with Git before implementation |
| Root workspace has `client`, `server`, and `docs` packages/directories                                                            | PENDING | —                                     |
| Root scripts exactly support `dev`, `dev:client`, `dev:server`, `build`, `lint`, `test`, `test:client`, `test:server`, and `seed` | PENDING | —                                     |
| Strict TypeScript is configured for client and server                                                                             | PENDING | —                                     |
| ESLint and Prettier are configured and runnable from the root                                                                     | PENDING | —                                     |
| `.gitignore` excludes `.env` files, build output, coverage, dependencies, logs, and generated uploads                             | PENDING | —                                     |
| `client/.env.example` and `server/.env.example` contain names only, not secrets                                                   | PENDING | —                                     |
| Server validates required environment variables during startup                                                                    | PENDING | —                                     |
| No dead code, placeholder actions, unexplained TODOs, or unused boilerplate remains                                               | PENDING | —                                     |

## 2. Backend foundation

| Requirement                                                                                           | Status  | Evidence / notes |
| ----------------------------------------------------------------------------------------------------- | ------- | ---------------- |
| Express app and process startup are separated for testability                                         | PENDING | —                |
| MongoDB/Mongoose connection lifecycle is implemented                                                  | PENDING | —                |
| A health endpoint reports process/database readiness safely                                           | PENDING | —                |
| Helmet, configured CORS, safe request logging, and JSON size limits are enabled                       | PENDING | —                |
| Login/authentication rate limiting returns `429` when exceeded                                        | PENDING | —                |
| Zod request validation covers params, query, and body data                                            | PENDING | —                |
| Custom application errors and async route handling are implemented                                    | PENDING | —                |
| Not-found and centralized error middleware use the documented response envelope                       | PENDING | —                |
| Zod, Mongoose, duplicate-key, ObjectId, and Multer errors are mapped safely                           | PENDING | —                |
| Production responses never expose stacks, database internals, environment values, or filesystem paths | PENDING | —                |
| Logs redact passwords, tokens, secrets, and sensitive request fields                                  | PENDING | —                |
| Swagger/OpenAPI is served at `GET /api/docs`                                                          | PENDING | —                |

## 3. Authentication and users

| Requirement                                                                           | Status  | Evidence / notes |
| ------------------------------------------------------------------------------------- | ------- | ---------------- |
| User model has the required fields, timestamps, defaults, and normalized unique email | PENDING | —                |
| Passwords require at least eight characters and are hashed with bcrypt                | PENDING | —                |
| `passwordHash` is excluded from every API response                                    | PENDING | —                |
| `POST /api/auth/register` registers an active `TEAM_MEMBER` by default                | PENDING | —                |
| `POST /api/auth/login` returns a JWT without revealing which credential was wrong     | PENDING | —                |
| Inactive users cannot log in or continue using protected APIs                         | PENDING | —                |
| `GET /api/auth/me` returns the current safe user                                      | PENDING | —                |
| Missing and invalid JWTs return `401`                                                 | PENDING | —                |
| Backend role middleware recognizes `ADMIN`, `PROJECT_MANAGER`, and `TEAM_MEMBER`      | PENDING | —                |
| `GET /api/users` supports safe search, role/status filters, sorting, and pagination   | PENDING | —                |
| `GET /api/users/:userId` is Admin-only and handles invalid/missing IDs safely         | PENDING | —                |
| Admin can update a valid user role                                                    | PENDING | —                |
| Admin can activate/deactivate users while accidental self-deactivation is prevented   | PENDING | —                |
| Role and status changes create safe audit records                                     | PENDING | —                |

## 4. Projects

| Requirement                                                                                               | Status  | Evidence / notes |
| --------------------------------------------------------------------------------------------------------- | ------- | ---------------- |
| Project model has required fields, status enum, timestamps, and references                                | PENDING | —                |
| Name, description length, required dates, and deadline ordering are validated                             | PENDING | —                |
| Duplicate member IDs are removed/rejected and only active users are accepted                              | PENDING | —                |
| Only an active Admin/Project Manager can be assigned as manager                                           | PENDING | —                |
| Admin can create, view, update, and delete any project                                                    | PENDING | —                |
| Project Manager can view/update only assigned projects                                                    | PENDING | —                |
| Team Member can view only projects in which they are a member                                             | PENDING | —                |
| Manager assignment endpoint enforces Admin-only authority                                                 | PENDING | —                |
| Member add/remove endpoints enforce role and assigned-project scope                                       | PENDING | —                |
| Project list search, status/manager/deadline filters, allow-listed sorting, and pagination run in MongoDB | PENDING | —                |
| Project mutations create the required audit records                                                       | PENDING | —                |

## 5. Tasks

| Requirement                                                                          | Status  | Evidence / notes |
| ------------------------------------------------------------------------------------ | ------- | ---------------- |
| Task model has required fields, status/priority enums, references, and timestamps    | PENDING | —                |
| Task creation validates project existence, due date, and project-member assignee     | PENDING | —                |
| Admin can manage tasks in every project                                              | PENDING | —                |
| Project Manager can create/update/delete/assign tasks only in assigned projects      | PENDING | —                |
| Team Member can view accessible tasks and change only their own assigned task status | PENDING | —                |
| Team Member cannot create, delete, or reassign tasks                                 | PENDING | —                |
| Status transition policy returns a clear validation error for invalid transitions    | PENDING | —                |
| `completedAt` is set on completion and cleared on reopen                             | PENDING | —                |
| `GET /api/tasks/my-tasks` returns only the authenticated user's assignments          | PENDING | —                |
| Project task list supports safe search, filters, sorting, and pagination in MongoDB  | PENDING | —                |
| Task create/update/delete/assignment/reassignment/status events are audited          | PENDING | —                |

## 6. Comments and attachments

| Requirement                                                                           | Status  | Evidence / notes |
| ------------------------------------------------------------------------------------- | ------- | ---------------- |
| Accessible users can add and list trimmed, non-empty, length-limited comments         | PENDING | —                |
| Authors can edit/delete their comments                                                | PENDING | —                |
| Admin can delete any comment; assigned Project Manager can moderate project comments  | PENDING | —                |
| Comment access is derived from task/project access                                    | PENDING | —                |
| Multer accepts one real file upload for an accessible task                            | PENDING | —                |
| Maximum upload size is environment-configured                                         | PENDING | —                |
| Only PDF, PNG, JPG/JPEG, TXT, DOC, and DOCX are accepted                              | PENDING | —                |
| Stored filenames are generated independently of untrusted original names              | PENDING | —                |
| Upload paths cannot escape the configured upload directory                            | PENDING | —                |
| Attachment metadata is stored in MongoDB without exposing server paths                | PENDING | —                |
| Attachment listing checks task access                                                 | PENDING | —                |
| Deletion removes metadata and the physical file and tolerates an already-missing file | PENDING | —                |
| Storage operations are isolated behind a replaceable local-storage service            | PENDING | —                |
| Generated uploads are ignored by Git; only an optional `.gitkeep` is tracked          | PENDING | —                |
| Attachment upload/deletion is audited                                                 | PENDING | —                |

## 7. Audit and dashboard

| Requirement                                                                                      | Status  | Evidence / notes |
| ------------------------------------------------------------------------------------------------ | ------- | ---------------- |
| Audit model contains actor, action, entity, safe summary/metadata, optional IP, and timestamp    | PENDING | —                |
| All required registration/login/user/project/task/attachment events are recorded                 | PENDING | —                |
| Audit metadata cannot contain passwords, JWTs, secrets, or full sensitive bodies                 | PENDING | —                |
| Audit listing is Admin-only, newest-first, paginated, and filterable by actor/action/entity/date | PENDING | —                |
| Dashboard overview uses MongoDB aggregations and respects role visibility                        | PENDING | —                |
| Overview returns project totals/statuses and task totals/statuses/pending/overdue values         | PENDING | —                |
| Deadlines returns accessible project/task dates in the next seven days                           | PENDING | —                |
| Project progress uses `completed / total * 100` and returns `0` for no tasks                     | PENDING | —                |
| Team performance returns name, assigned/completed/overdue counts, and completion percentage      | PENDING | —                |
| No invented productivity score or inaccessible organization data is returned                     | PENDING | —                |

## 8. Frontend

| Requirement                                                                                  | Status  | Evidence / notes |
| -------------------------------------------------------------------------------------------- | ------- | ---------------- |
| React/Vite/TypeScript/Tailwind client starts and builds                                      | PENDING | —                |
| React Router provides Login, Register, Not Found, and all authenticated pages                | PENDING | —                |
| Authenticated, Admin-only, and Admin-or-Project-Manager route guards are implemented         | PENDING | —                |
| Backend remains authoritative when a hidden/disabled UI action is called directly            | PENDING | —                |
| Central Axios client adds bearer token and handles API errors/`401` consistently             | PENDING | —                |
| JWT persistence strategy is documented and its `localStorage` XSS limitation is stated       | PENDING | —                |
| TanStack Query manages server state, mutations, loading/errors, and invalidation             | PENDING | —                |
| React Hook Form and Zod validate login/register/project/task forms                           | PENDING | —                |
| Responsive desktop sidebar, mobile navigation, header, and user menu work                    | PENDING | —                |
| Dashboard has real summary cards, two charts, progress, deadlines, and performance table     | PENDING | —                |
| Project list/detail/create/edit/member/manager flows enforce visible role capabilities       | PENDING | —                |
| Task list/detail/create/edit/assign/status/My Tasks flows work                               | PENDING | —                |
| Comment and attachment interactions work on Task Details                                     | PENDING | —                |
| Admin User Management and Audit Log pages work                                               | PENDING | —                |
| Profile and logout work                                                                      | PENDING | —                |
| Backend search/filter/sort/pagination is wired for users/projects/tasks/audit                | PENDING | —                |
| Filter changes reset to page 1; text search is debounced where practical                     | PENDING | —                |
| Loading skeletons, empty states, error states, field errors, and toasts are present          | PENDING | —                |
| Destructive actions require confirmation                                                     | PENDING | —                |
| Controls have labels, focus states, keyboard access, and sensible status text/color contrast | PENDING | —                |
| Every visible navigation item and action is functional                                       | PENDING | —                |

## 9. Testing

Detailed cases and commands are in [TESTING.md](./TESTING.md).

| Requirement                                                                                     | Status  | Evidence / notes |
| ----------------------------------------------------------------------------------------------- | ------- | ---------------- |
| Backend test environment uses MongoDB Memory Server or another isolated non-production database | PENDING | —                |
| All 24 required backend behavior cases are implemented and deterministic                        | PENDING | —                |
| All 7 required frontend behavior cases are implemented and deterministic                        | PENDING | —                |
| Root, client, and server test scripts exit successfully                                         | PENDING | —                |
| Lint and strict TypeScript checks pass                                                          | PENDING | —                |
| Client and server production builds pass                                                        | PENDING | —                |
| Coverage reports identify rather than conceal untested authorization branches                   | PENDING | —                |

## 10. Seed, API documentation, and demo

| Requirement                                                                                                               | Status  | Evidence / notes                       |
| ------------------------------------------------------------------------------------------------------------------------- | ------- | -------------------------------------- |
| Development seed is repeatable and clearly guarded from production                                                        | PENDING | —                                      |
| Seed has 1 Admin, 1 Project Manager, 3 Team Members, 2 projects, memberships, tasks, comments, upcoming and overdue dates | PENDING | —                                      |
| Demo credentials use only the documented local-only accounts/password                                                     | PENDING | —                                      |
| OpenAPI documents bearer auth, roles, every route, reusable schemas, params, and common errors                            | PENDING | —                                      |
| Postman collection imports successfully and contains all required route groups and variables                              | PENDING | See `docs/postman`; runtime not tested |
| Postman login script stores a returned JWT in `accessToken`                                                               | PENDING | Static JSON only; runtime not tested   |
| Mandatory connected 20-step demo flow succeeds                                                                            | PENDING | See [DEMO.md](./DEMO.md)               |

## 11. Render and Vercel deployment

| Requirement                                                                                | Status  | Evidence / notes                     |
| ------------------------------------------------------------------------------------------ | ------- | ------------------------------------ |
| Render Blueprint builds and starts the server from the root workspace                      | PENDING | `render.yaml`                        |
| Render health check, Atlas secrets, and first-Admin bootstrap are configured               | PENDING | `render.yaml`                        |
| Vercel uses `client` as root with a Vite build and SPA fallback                            | PENDING | `client/vercel.json`                 |
| Atlas/database, backend, and frontend deployment configuration is prepared                 | PENDING | —                                    |
| Production CORS, frontend API URL, secrets, persistence, and health behavior are verified  | PENDING | —                                    |
| Ephemeral attachment limitations or a persistent Render disk are documented                | PENDING | See [DEPLOYMENT.md](./DEPLOYMENT.md) |
| Real deployment URLs and credential-backed verification are recorded only after deployment | PENDING | See [DEPLOYMENT.md](./DEPLOYMENT.md) |

## 12. Documentation and final acceptance

| Requirement                                                                                                     | Status  | Evidence / notes                                       |
| --------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------ |
| README matches the actual scripts, structure, environment, routes, limitations, and results                     | PENDING | Root README is outside this documentation track        |
| Architecture guide matches the implemented client/server boundaries                                             | PENDING | Draft target: [ARCHITECTURE.md](./ARCHITECTURE.md)     |
| ER diagram and index list match actual Mongoose schemas                                                         | PENDING | Draft target: [ERD.md](./ERD.md)                       |
| API guide matches implemented OpenAPI and behavior                                                              | PENDING | Draft target: [API.md](./API.md)                       |
| Testing guide reflects real commands and results                                                                | PENDING | Draft target: [TESTING.md](./TESTING.md)               |
| Deployment and demo guides are exercised rather than assumed                                                    | PENDING | [DEPLOYMENT.md](./DEPLOYMENT.md), [DEMO.md](./DEMO.md) |
| Every item in `FINAL_QA.md` has evidence and no item remains `NOT TESTED`                                       | PENDING | [FINAL_QA.md](./FINAL_QA.md)                           |
| Final report includes exact Git, test, lint, build, URL, credential, deployment, limitation, and worktree facts | PENDING | —                                                      |

## Per-feature definition of done

Before changing any feature row to `DONE`, confirm all applicable items below:

- [ ] Required behavior exists and is reachable through the intended API/UI.
- [ ] Backend authorization and resource-scope checks are enforced.
- [ ] Input is validated at the trust boundary.
- [ ] Errors use safe, consistent responses and correct status codes.
- [ ] Client loading, empty, error, and success feedback exists.
- [ ] Focused tests pass deterministically.
- [ ] Relevant lint, strict TypeScript, and build checks pass.
- [ ] Documentation reflects the implemented behavior.
- [ ] No secrets, generated uploads, or unrelated files are included.
- [ ] The focused commit is pushed to `origin/main` without rewriting history.
