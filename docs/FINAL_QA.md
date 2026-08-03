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

| Field                        | Value                                                                 |
| ---------------------------- | --------------------------------------------------------------------- |
| Date/time and timezone       | 2026-08-03 22:00 IST                                                  |
| Commit hash/build identifier | `74a694c5c0`                                                          |
| Branch                       | `main`                                                                |
| Node/npm versions            | Node `v26.3.0`; npm `11.16.0`                                         |
| Browser/OS                   | HTTP production smoke on Darwin 25.5.0 arm64; browser UI not executed |
| MongoDB mode/version         | Docker `mongo:7.0`                                                    |
| Tester                       | Local automated and connected API verification                        |

## Required final end-to-end verification

|   # | Check                                                                    | Initial status | Evidence / notes                                                    |
| --: | ------------------------------------------------------------------------ | -------------- | ------------------------------------------------------------------- |
|   1 | Install dependencies from a clean state/lockfile                         | PASS           | Docker clean stages ran `npm ci`; root offline lock dry-run passed  |
|   2 | Run all lint commands                                                    | PASS           | `npm run lint`                                                      |
|   3 | Run all automated tests                                                  | PASS           | 20 backend + 9 frontend tests                                       |
|   4 | Run frontend production build                                            | PASS           | TypeScript + Vite production build                                  |
|   5 | Run backend production build                                             | PASS           | TypeScript build and Docker production stage                        |
|   6 | Start MongoDB                                                            | PASS           | Docker `mongo:7.0` healthy                                          |
|   7 | Start backend and verify readiness                                       | PASS           | Server healthy; `/api/health` returned `status: ok`                 |
|   8 | Start frontend and load the application                                  | PASS           | Nginx healthy; production HTML contains `CountryEdu NexaTask`       |
|   9 | Seed development data                                                    | PASS           | Docker seed completed without logging the demo password             |
|  10 | Test Admin login                                                         | PASS           | Connected API login returned `ADMIN`                                |
|  11 | Test Project Manager login                                               | PASS           | Connected API login returned `PROJECT_MANAGER`                      |
|  12 | Test Team Member login                                                   | PASS           | Connected API login returned `TEAM_MEMBER`                          |
|  13 | Create a project                                                         | PASS           | Connected API flow created and later cleaned up a QA project        |
|  14 | Assign a Project Manager                                                 | PASS           | Dedicated manager endpoint verified                                 |
|  15 | Add Team Members                                                         | PASS           | Dedicated membership endpoint verified                              |
|  16 | Create a task                                                            | PASS           | Assigned manager created connected QA task                          |
|  17 | Assign a task to a project member                                        | PASS           | Dedicated assignee endpoint verified                                |
|  18 | Update own assigned task status as Team Member                           | PASS           | `TODO -> IN_PROGRESS -> COMPLETED`; `completedAt` verified          |
|  19 | Add a comment to an accessible task                                      | PASS           | Trimmed persisted comment verified                                  |
|  20 | Upload an allowed attachment                                             | PASS           | Multipart TXT upload returned safe metadata                         |
|  21 | Delete attachment metadata and physical file                             | PASS           | Delete succeeded; regression list empty; Docker upload volume empty |
|  22 | Search projects through backend query                                    | PASS           | Connected project query                                             |
|  23 | Filter projects through backend query                                    | PASS           | `status=ACTIVE` verified                                            |
|  24 | Paginate projects and verify boundary metadata                           | PASS           | Page/limit metadata verified                                        |
|  25 | Search tasks through backend query                                       | PASS           | Connected task query                                                |
|  26 | Filter tasks through backend query                                       | PASS           | Status/priority filters verified                                    |
|  27 | Paginate tasks and verify boundary metadata                              | PASS           | Page/limit metadata verified                                        |
|  28 | Verify dashboard numbers against known MongoDB data                      | PASS           | Exact aggregation regression test + connected overview              |
|  29 | Verify project progress, including zero-task project                     | PASS           | Connected 100% and zero-task 0% cases verified                      |
|  30 | Verify upcoming project/task deadlines within seven days                 | PASS           | Seeded connected deadline endpoint returned upcoming items          |
|  31 | Verify team-performance counts and percentages                           | PASS           | Exact role-scoped regression test                                   |
|  32 | Verify required audit logs and safe metadata                             | PASS           | Connected audit list + safe audit regression test                   |
|  33 | Verify representative unauthorized actions return `403` with no mutation | PASS           | Team Member Admin-route request returned `403`                      |
|  34 | Verify missing JWT returns `401`                                         | PASS           | Connected protected request returned `401`                          |
|  35 | Verify Swagger loads at `/api/docs` and matches runtime                  | PASS           | `/api/docs.json`: OpenAPI 3.0.3 with documented paths               |
|  36 | Verify Postman collection imports and executes the intended flow         | NOT TESTED     | Static JSON validated; collection was not run in Postman            |
|  37 | Verify `docker compose up --build` and service health where possible     | PASS           | Mongo, server, and client all report healthy                        |
|  38 | Verify README commands exactly match package scripts/behavior            | PASS           | Documented install/lint/test/build/seed/Compose commands executed   |
|  39 | Verify real `.env` files/secrets are not tracked                         | PASS           | `git ls-files` shows only `.env.example` files                      |
|  40 | Verify generated uploads are not tracked                                 | PASS           | Only `server/uploads/.gitkeep` is tracked                           |
|  41 | Record exact final `git status`                                          | NOT TESTED     | Recorded after the evidence commit in final handoff                 |
|  42 | Review `git log --oneline --decorate --graph` for focused history        | PASS           | Focused feature/fix/docs commits reviewed                           |
|  43 | Push final verified commit to `origin/main` without force                | NOT TESTED     | Performed after this evidence commit                                |

## Required automated backend coverage

| Check                                                        | Initial status | Evidence / notes                         |
| ------------------------------------------------------------ | -------------- | ---------------------------------------- |
| Successful registration, normalized email, safe default role | PASS           | Backend integration suite                |
| Duplicate-email rejection                                    | PASS           | Backend integration suite                |
| Password hashing and response exclusion                      | PASS           | Backend integration suite                |
| Successful and invalid login                                 | PASS           | Backend integration suite                |
| Inactive user login rejection                                | PASS           | Backend integration suite                |
| Missing and invalid JWT rejection                            | PASS           | Backend integration suite                |
| Role authorization                                           | PASS           | Backend integration suite + runtime flow |
| Admin project creation and unauthorized denial               | PASS           | Backend integration suite + runtime flow |
| Project deadline validation                                  | PASS           | Backend integration suite                |
| Project Manager assigned-scope restriction                   | PASS           | Backend integration suite                |
| Member add and invalid/inactive rejection                    | PASS           | Backend integration suite                |
| Task create and invalid assignee rejection                   | PASS           | Backend integration suite                |
| Team Member own status update and delete denial              | PASS           | Backend integration suite + runtime flow |
| Search, filtering, and pagination metadata                   | PASS           | Backend integration suite + runtime flow |
| Dashboard aggregation expected values                        | PASS           | Backend integration suite + runtime flow |
| Important action creates one safe audit event                | PASS           | Backend integration suite + runtime flow |

## Required automated frontend coverage

| Check                       | Initial status | Evidence / notes                |
| --------------------------- | -------------- | ------------------------------- |
| Login-form validation       | PASS           | Frontend component test         |
| Register-form validation    | PASS           | Frontend component test         |
| Protected-route behavior    | PASS           | Frontend route-guard tests      |
| Role-based navigation       | PASS           | Frontend layout and guard tests |
| One project interaction     | PASS           | Project filter/navigation test  |
| One task-status interaction | PASS           | Task status mutation test       |
| Loading or error state      | PASS           | Accessible async-state tests    |

## Security, validation, and UX acceptance

| Check                                                                             | Initial status | Evidence / notes                                            |
| --------------------------------------------------------------------------------- | -------------- | ----------------------------------------------------------- |
| Passwords are bcrypt-hashed and never returned/logged                             | PASS           | Hash/response test; final seed output contains no password  |
| JWTs/secrets/Authorization headers are not logged                                 | PASS           | Runtime request logs reviewed; no header/token values       |
| Current inactive user is rejected on protected API                                | NOT TESTED     | —                                                           |
| Admin accidental self-deactivation is prevented                                   | NOT TESTED     | —                                                           |
| CORS is restricted to configured client origin                                    | PASS           | Untrusted `Origin` request returned `403`                   |
| Helmet and authentication rate limiting are active                                | PASS           | Runtime security and `RateLimit-Policy` headers verified    |
| Invalid ObjectId/Zod/Mongoose/duplicate/Multer errors use safe envelopes          | NOT TESTED     | —                                                           |
| Search input, page/limit, date ranges, and sort allow-lists are enforced          | NOT TESTED     | Search/filter/pagination passed; every invalid edge not run |
| Upload size/type/generated filename/path traversal protections work               | NOT TESTED     | Allowed upload passed; every rejection edge not run         |
| Attachment deletion safely handles an already-missing physical file               | NOT TESTED     | —                                                           |
| Audit metadata contains no passwords, JWTs, secrets, or full sensitive bodies     | PASS           | Safe audit regression test                                  |
| Error responses expose no stack, Mongo internals, environment, or filesystem path | NOT TESTED     | —                                                           |
| Responsive desktop/mobile navigation works                                        | NOT TESTED     | —                                                           |
| Loading, empty, error, validation, toast, and confirmation states work            | NOT TESTED     | Automated subset passed; full browser UX pass remains       |
| Keyboard access, labels, focus, and status/priority meaning are usable            | NOT TESTED     | —                                                           |
| No visible menu item/button is fake or inert                                      | NOT TESTED     | —                                                           |

## Mandatory demo flow gate

| Check                                                                       | Initial status | Evidence / notes                     |
| --------------------------------------------------------------------------- | -------------- | ------------------------------------ |
| All 20 connected steps in `DEMO.md` succeed on one recorded build           | NOT TESTED     | —                                    |
| Admin -> Project Manager -> Team Member role handoff is enforced by backend | PASS           | Connected API role handoff completed |
| Dashboard and project progress update after task completion                 | PASS           | Connected progress changed to 100%   |
| Admin can locate related safe audit events                                  | PASS           | Connected audit query succeeded      |

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

| Required field               | Initial status      | Final value / evidence                                                            |
| ---------------------------- | ------------------- | --------------------------------------------------------------------------------- |
| Project name                 | PASS                | CountryEdu NexaTask                                                               |
| Current branch               | PASS                | `main`                                                                            |
| Git remote                   | PASS                | `https://github.com/rohitpokhariya10/Nexatask-project-management-system.git`      |
| Total commits created        | PASS                | 14 including this evidence commit                                                 |
| Final commit hash            | PASS                | Verified implementation build `74a694c`; evidence-commit hash is in final handoff |
| Push status                  | PASS                | Implementation build pushed to `origin/main`; evidence commit follows             |
| Completed features           | PASS                | Auth/RBAC, users, projects, tasks, collaboration, dashboards, audit, docs, Docker |
| Remaining features           | PASS                | Hosted deployment and manual browser/Postman presentation verification            |
| Test results                 | PASS                | 20 backend + 9 frontend tests                                                     |
| Lint results                 | PASS                | Root client/server lint passed                                                    |
| Build results                | PASS                | Backend and frontend production builds passed                                     |
| Docker result                | PASS                | Mongo, backend, and frontend healthy                                              |
| Swagger URL/result           | PASS                | `http://127.0.0.1:5000/api/docs`; runtime schema verified                         |
| Local frontend URL/result    | PASS                | `http://127.0.0.1:5173`; health/title verified                                    |
| Local backend URL/result     | PASS                | `http://127.0.0.1:5000`; health/login/workflow verified                           |
| Demo credentials/seed result | PASS                | Seed passed; local-only credentials are in `DEMO.md`                              |
| Deployment status/URLs       | PENDING CREDENTIALS | No hosting or production MongoDB credentials were provided                        |
| Known limitations            | PASS                | Manual browser QA pending; frontend emits an 882 kB chunk warning                 |
| Exact final Git status       | NOT TESTED          | Recorded after committing and pushing this evidence update                        |
