# CountryEdu NexaTask final QA record

## Rules

This is an evidence ledger, not a forecast. Its initial state is deliberately unverified.

Only these status values are allowed:

- `PASS`: the exact check was executed successfully against the recorded build and evidence is present.
- `FAIL`: the check was executed and failed; record the failure.
- `NOT TESTED`: the check has not been executed on the recorded build.
- `PENDING CREDENTIALS`: the check requires external credentials that are not available.

Never infer `PASS` from code review, file presence, another command, or an earlier build. Replace `—` with the command/result, sanitized log, screenshot, request ID, commit, or URL. Do not put secrets or live JWTs in this file.

## Test record

| Field                        | Value      |
| ---------------------------- | ---------- |
| Date/time and timezone       | NOT TESTED |
| Commit hash/build identifier | NOT TESTED |
| Branch                       | NOT TESTED |
| Node/npm versions            | NOT TESTED |
| Browser/OS                   | NOT TESTED |
| MongoDB mode/version         | NOT TESTED |
| Tester                       | NOT TESTED |

## Required final end-to-end verification

|   # | Check                                                                    | Initial status | Evidence / notes                                         |
| --: | ------------------------------------------------------------------------ | -------------- | -------------------------------------------------------- |
|   1 | Install dependencies from a clean state/lockfile                         | NOT TESTED     | —                                                        |
|   2 | Run all lint commands                                                    | NOT TESTED     | —                                                        |
|   3 | Run all automated tests                                                  | NOT TESTED     | —                                                        |
|   4 | Run frontend production build                                            | NOT TESTED     | —                                                        |
|   5 | Run backend production build                                             | NOT TESTED     | —                                                        |
|   6 | Start MongoDB                                                            | NOT TESTED     | —                                                        |
|   7 | Start backend and verify readiness                                       | NOT TESTED     | —                                                        |
|   8 | Start frontend and load the application                                  | NOT TESTED     | —                                                        |
|   9 | Seed development data                                                    | NOT TESTED     | —                                                        |
|  10 | Test Admin login                                                         | NOT TESTED     | —                                                        |
|  11 | Test Project Manager login                                               | NOT TESTED     | —                                                        |
|  12 | Test Team Member login                                                   | NOT TESTED     | —                                                        |
|  13 | Create a project                                                         | NOT TESTED     | —                                                        |
|  14 | Assign a Project Manager                                                 | NOT TESTED     | —                                                        |
|  15 | Add Team Members                                                         | NOT TESTED     | —                                                        |
|  16 | Create a task                                                            | NOT TESTED     | —                                                        |
|  17 | Assign a task to a project member                                        | NOT TESTED     | —                                                        |
|  18 | Update own assigned task status as Team Member                           | NOT TESTED     | —                                                        |
|  19 | Add a comment to an accessible task                                      | NOT TESTED     | —                                                        |
|  20 | Upload an allowed attachment                                             | NOT TESTED     | —                                                        |
|  21 | Delete attachment metadata and physical file                             | NOT TESTED     | —                                                        |
|  22 | Search projects through backend query                                    | NOT TESTED     | —                                                        |
|  23 | Filter projects through backend query                                    | NOT TESTED     | —                                                        |
|  24 | Paginate projects and verify boundary metadata                           | NOT TESTED     | —                                                        |
|  25 | Search tasks through backend query                                       | NOT TESTED     | —                                                        |
|  26 | Filter tasks through backend query                                       | NOT TESTED     | —                                                        |
|  27 | Paginate tasks and verify boundary metadata                              | NOT TESTED     | —                                                        |
|  28 | Verify dashboard numbers against known MongoDB data                      | NOT TESTED     | —                                                        |
|  29 | Verify project progress, including zero-task project                     | NOT TESTED     | —                                                        |
|  30 | Verify upcoming project/task deadlines within seven days                 | NOT TESTED     | —                                                        |
|  31 | Verify team-performance counts and percentages                           | NOT TESTED     | —                                                        |
|  32 | Verify required audit logs and safe metadata                             | NOT TESTED     | —                                                        |
|  33 | Verify representative unauthorized actions return `403` with no mutation | NOT TESTED     | —                                                        |
|  34 | Verify missing JWT returns `401`                                         | NOT TESTED     | —                                                        |
|  35 | Verify Swagger loads at `/api/docs` and matches runtime                  | NOT TESTED     | —                                                        |
|  36 | Verify Postman collection imports and executes the intended flow         | NOT TESTED     | Static JSON validation alone is not runtime verification |
|  37 | Verify `docker compose up --build` and service health where possible     | NOT TESTED     | —                                                        |
|  38 | Verify README commands exactly match package scripts/behavior            | NOT TESTED     | —                                                        |
|  39 | Verify real `.env` files/secrets are not tracked                         | NOT TESTED     | —                                                        |
|  40 | Verify generated uploads are not tracked                                 | NOT TESTED     | —                                                        |
|  41 | Record exact final `git status`                                          | NOT TESTED     | —                                                        |
|  42 | Review `git log --oneline --decorate --graph` for focused history        | NOT TESTED     | —                                                        |
|  43 | Push final verified commit to `origin/main` without force                | NOT TESTED     | —                                                        |

## Required automated backend coverage

| Check                                                        | Initial status | Evidence / notes |
| ------------------------------------------------------------ | -------------- | ---------------- |
| Successful registration, normalized email, safe default role | NOT TESTED     | —                |
| Duplicate-email rejection                                    | NOT TESTED     | —                |
| Password hashing and response exclusion                      | NOT TESTED     | —                |
| Successful and invalid login                                 | NOT TESTED     | —                |
| Inactive user login rejection                                | NOT TESTED     | —                |
| Missing and invalid JWT rejection                            | NOT TESTED     | —                |
| Role authorization                                           | NOT TESTED     | —                |
| Admin project creation and unauthorized denial               | NOT TESTED     | —                |
| Project deadline validation                                  | NOT TESTED     | —                |
| Project Manager assigned-scope restriction                   | NOT TESTED     | —                |
| Member add and invalid/inactive rejection                    | NOT TESTED     | —                |
| Task create and invalid assignee rejection                   | NOT TESTED     | —                |
| Team Member own status update and delete denial              | NOT TESTED     | —                |
| Search, filtering, and pagination metadata                   | NOT TESTED     | —                |
| Dashboard aggregation expected values                        | NOT TESTED     | —                |
| Important action creates one safe audit event                | NOT TESTED     | —                |

## Required automated frontend coverage

| Check                       | Initial status | Evidence / notes |
| --------------------------- | -------------- | ---------------- |
| Login-form validation       | NOT TESTED     | —                |
| Register-form validation    | NOT TESTED     | —                |
| Protected-route behavior    | NOT TESTED     | —                |
| Role-based navigation       | NOT TESTED     | —                |
| One project interaction     | NOT TESTED     | —                |
| One task-status interaction | NOT TESTED     | —                |
| Loading or error state      | NOT TESTED     | —                |

## Security, validation, and UX acceptance

| Check                                                                             | Initial status | Evidence / notes |
| --------------------------------------------------------------------------------- | -------------- | ---------------- |
| Passwords are bcrypt-hashed and never returned/logged                             | NOT TESTED     | —                |
| JWTs/secrets/Authorization headers are not logged                                 | NOT TESTED     | —                |
| Current inactive user is rejected on protected API                                | NOT TESTED     | —                |
| Admin accidental self-deactivation is prevented                                   | NOT TESTED     | —                |
| CORS is restricted to configured client origin                                    | NOT TESTED     | —                |
| Helmet and authentication rate limiting are active                                | NOT TESTED     | —                |
| Invalid ObjectId/Zod/Mongoose/duplicate/Multer errors use safe envelopes          | NOT TESTED     | —                |
| Search input, page/limit, date ranges, and sort allow-lists are enforced          | NOT TESTED     | —                |
| Upload size/type/generated filename/path traversal protections work               | NOT TESTED     | —                |
| Attachment deletion safely handles an already-missing physical file               | NOT TESTED     | —                |
| Audit metadata contains no passwords, JWTs, secrets, or full sensitive bodies     | NOT TESTED     | —                |
| Error responses expose no stack, Mongo internals, environment, or filesystem path | NOT TESTED     | —                |
| Responsive desktop/mobile navigation works                                        | NOT TESTED     | —                |
| Loading, empty, error, validation, toast, and confirmation states work            | NOT TESTED     | —                |
| Keyboard access, labels, focus, and status/priority meaning are usable            | NOT TESTED     | —                |
| No visible menu item/button is fake or inert                                      | NOT TESTED     | —                |

## Mandatory demo flow gate

| Check                                                                       | Initial status | Evidence / notes |
| --------------------------------------------------------------------------- | -------------- | ---------------- |
| All 20 connected steps in `DEMO.md` succeed on one recorded build           | NOT TESTED     | —                |
| Admin -> Project Manager -> Team Member role handoff is enforced by backend | NOT TESTED     | —                |
| Dashboard and project progress update after task completion                 | NOT TESTED     | —                |
| Admin can locate related safe audit events                                  | NOT TESTED     | —                |

## Deployment verification

| Check                                                        | Initial status      | Evidence / notes |
| ------------------------------------------------------------ | ------------------- | ---------------- |
| Production MongoDB/Atlas connection and least-privilege user | PENDING CREDENTIALS | —                |
| Hosted backend build, health, Swagger, and HTTPS             | PENDING CREDENTIALS | —                |
| Hosted frontend build, SPA rewrites, and HTTPS               | PENDING CREDENTIALS | —                |
| Production CORS and frontend API URL                         | PENDING CREDENTIALS | —                |
| Hosted Admin/Manager/Member login and role scopes            | PENDING CREDENTIALS | —                |
| Durable attachment storage across restart/redeploy           | PENDING CREDENTIALS | —                |
| Real frontend/backend URLs recorded                          | PENDING CREDENTIALS | —                |

## Final report fields

Do not publish the final report until each value is factual.

| Required field               | Initial status      | Final value / evidence                                    |
| ---------------------------- | ------------------- | --------------------------------------------------------- |
| Project name                 | NOT TESTED          | CountryEdu NexaTask (confirm repository/product metadata) |
| Current branch               | NOT TESTED          | —                                                         |
| Git remote                   | NOT TESTED          | —                                                         |
| Total commits created        | NOT TESTED          | —                                                         |
| Final commit hash            | NOT TESTED          | —                                                         |
| Push status                  | NOT TESTED          | —                                                         |
| Completed features           | NOT TESTED          | —                                                         |
| Remaining features           | NOT TESTED          | —                                                         |
| Test results                 | NOT TESTED          | —                                                         |
| Lint results                 | NOT TESTED          | —                                                         |
| Build results                | NOT TESTED          | —                                                         |
| Docker result                | NOT TESTED          | —                                                         |
| Swagger URL/result           | NOT TESTED          | —                                                         |
| Local frontend URL/result    | NOT TESTED          | —                                                         |
| Local backend URL/result     | NOT TESTED          | —                                                         |
| Demo credentials/seed result | NOT TESTED          | —                                                         |
| Deployment status/URLs       | PENDING CREDENTIALS | —                                                         |
| Known limitations            | NOT TESTED          | —                                                         |
| Exact final Git status       | NOT TESTED          | —                                                         |
