# CountryEdu NexaTask demo guide

## Demo status

The browser-driven flow below remains `NOT TESTED`; expected results describe its acceptance criteria. On 2026-08-03, commit `74a694c` passed a connected API version of the role handoff against the Docker stack: all three logins, project/manager/member setup, task assignment and completion, comment, attachment upload/delete, dashboard progress, audit visibility, `401`/`403` checks, queries, and cleanup. This API evidence does not substitute for the remaining manual browser/UX pass.

## Local-only credentials

Use these only after running the development seed. They are public demo credentials and must never be reused in staging/production.

| Persona         | Email                   | Password     |
| --------------- | ----------------------- | ------------ |
| Admin           | `admin@nexatask.demo`   | `Demo@12345` |
| Project Manager | `manager@nexatask.demo` | `Demo@12345` |
| Team Member 1   | `member1@nexatask.demo` | `Demo@12345` |
| Team Member 2   | `member2@nexatask.demo` | `Demo@12345` |
| Team Member 3   | `member3@nexatask.demo` | `Demo@12345` |

The seed target is one Admin, one Project Manager, at least three Team Members, at least two projects with memberships, tasks across all statuses/priorities, upcoming deadlines, at least one overdue non-completed task, several comments, and meaningful dashboard data.

## Preparation

1. Configure development-only client/server environment files from their examples.
2. Start a non-production MongoDB (or the full Compose stack).
3. Install dependencies and run `npm run seed`.
4. Run `npm run dev` (or `docker compose up --build`).
5. Confirm the API health target, client, and `/api/docs` load.
6. Use a small supported sample file containing no sensitive information for upload.
7. Open browser developer tools so failed requests and status codes are visible.

Expected local targets, subject to actual configuration:

- Client: `http://localhost:5173`
- API: `http://localhost:5000`
- Swagger: `http://localhost:5000/api/docs`

## Mandatory connected flow

Use one newly created project/task so the later dashboard and audit observations refer to the same records.

|   # | Actor and action                                  | Expected result                                                                          | Status     | Evidence |
| --: | ------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------- | -------- |
|   1 | Admin logs in                                     | Redirect to Dashboard; no password/token in logs                                         | NOT TESTED | —        |
|   2 | Admin opens User Management                       | Paginated users load with search/filter controls                                         | NOT TESTED | —        |
|   3 | Admin assigns a user the Project Manager role     | Role badge updates and an audit event is created                                         | NOT TESTED | —        |
|   4 | Admin creates a project with valid start/deadline | Project appears in list/detail with `PLANNING` or selected status                        | NOT TESTED | —        |
|   5 | Admin assigns the Project Manager                 | Manager appears in project detail and gains access                                       | NOT TESTED | —        |
|   6 | Admin adds Team Members                           | Members appear once; inactive/nonexistent users are unavailable/rejected                 | NOT TESTED | —        |
|   7 | Project Manager logs in                           | Only assigned projects are visible                                                       | NOT TESTED | —        |
|   8 | Project Manager opens the new assigned project    | Detail/member/task controls allowed by role load                                         | NOT TESTED | —        |
|   9 | Project Manager creates a task                    | Task starts `TODO` with chosen priority/due date                                         | NOT TESTED | —        |
|  10 | Project Manager assigns it to a Team Member       | Assignee updates; assignment/reassignment is audited                                     | NOT TESTED | —        |
|  11 | Team Member logs in                               | Admin/manager-only navigation is absent                                                  | NOT TESTED | —        |
|  12 | Team Member opens My Tasks                        | Newly assigned task appears                                                              | NOT TESTED | —        |
|  13 | Team Member changes `TODO` to `IN_PROGRESS`       | Status updates; `completedAt` remains empty                                              | NOT TESTED | —        |
|  14 | Team Member changes `IN_PROGRESS` to `COMPLETED`  | Status updates and `completedAt` is populated                                            | NOT TESTED | —        |
|  15 | Team Member adds a comment                        | Trimmed comment appears with correct author                                              | NOT TESTED | —        |
|  16 | Team Member uploads a supported attachment        | Safe metadata appears; no server path is exposed                                         | NOT TESTED | —        |
|  17 | Team Member views Dashboard                       | Relevant assigned-work statistics reflect completion                                     | NOT TESTED | —        |
|  18 | Project progress is inspected                     | Completed/total percentage updates; no divide-by-zero issue                              | NOT TESTED | —        |
|  19 | Admin logs in again                               | Organization-wide dashboard/project access returns                                       | NOT TESTED | —        |
|  20 | Admin opens Audit Logs and filters related events | Role/project/task/status/attachment events are present, newest first, with safe metadata | NOT TESTED | —        |

## Required side checks during the demo

- Attempt one Admin-only action as the Team Member through the API and observe `403`, not just a hidden button.
- Call a protected endpoint without a JWT and observe `401`.
- As Project Manager, attempt to open/manage an unrelated project and observe the documented denial.
- As Team Member, attempt task deletion/reassignment and observe `403` with no mutation.
- Edit/delete the Team Member's own comment; confirm another Team Member cannot edit it.
- List attachments, delete the uploaded attachment through an authorized persona, and confirm both metadata and file access are gone.
- Search, filter, sort, and paginate projects and tasks using enough seed rows to exercise page boundaries.
- Verify Project Manager dashboard excludes unrelated projects and Team Member metrics exclude unrelated work.
- Inspect Swagger and run the Postman Login -> protected request flow.
- Confirm visible loading, empty, error, toast, validation, and destructive-confirmation states.
- Resize to a narrow viewport and exercise mobile navigation without losing functionality.

## Presenter narrative

1. Start with the role model: the same data produces different capabilities because the server applies scope.
2. Show organization setup through Admin user/project controls.
3. Hand work to the Project Manager, who can manage the assigned project but not organization-wide settings.
4. Hand the task to the Team Member, who owns progress updates and collaboration but cannot reassign/delete it.
5. Finish with real aggregation changes and the safe audit trail tying the flow together.

Avoid claiming production deployment, Docker success, test success, or complete feature coverage unless the corresponding `FINAL_QA.md` evidence is already recorded.

## Demo troubleshooting

| Symptom                            | Check                                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Login returns `401`                | Confirm seed ran against the same development DB, user is active, and environment/token secret is consistent |
| Browser CORS failure               | Compare exact client origin/port with `CLIENT_URL`; do not switch to a permissive production wildcard        |
| Project missing for manager/member | Confirm manager/member mutation succeeded and current user was refreshed                                     |
| Assignee rejected                  | Confirm user is active and belongs to the task's project                                                     |
| Dashboard looks stale              | Confirm mutation succeeded and relevant TanStack Query keys were invalidated/refetched                       |
| Upload rejected                    | Confirm supported MIME/extension and `MAX_FILE_SIZE`; inspect safe API error                                 |
| Upload disappears after restart    | Confirm `UPLOAD_DIRECTORY` and durable volume/object-storage policy                                          |
| Audit event absent                 | Confirm business operation completed and audit write path/test; do not fabricate a log                       |

## Demo completion record

After execution, record date/time, commit hash, environment, browser, database reset/seed result, each failed step, sanitized screenshots, and URLs. Mirror final statuses in [FINAL_QA.md](./FINAL_QA.md). If the flow was not run end to end on one build, it remains `NOT TESTED`.
