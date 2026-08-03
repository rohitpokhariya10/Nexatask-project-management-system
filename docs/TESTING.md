# CountryEdu NexaTask testing guide

## Current status

No command result is implied by this guide. Every required case below starts `NOT TESTED`; update a row only after recording the exact command and result. Never point tests at a production database.

## Intended commands

From the repository root:

```bash
npm run lint
npm run test
npm run test:server
npm run test:client
npm run build
```

The scripts must match the root `package.json` before these commands are treated as authoritative. During development, package-specific Vitest commands may be used for focused feedback, followed by the root gates.

## Test architecture

### Server

- Vitest or Jest drives tests; Supertest calls the Express app without a real listening port.
- MongoDB Memory Server (or an explicitly isolated test MongoDB) supplies a fresh database. Production/staging URLs are forbidden.
- Global setup connects only after confirming test environment; teardown drops the test database, closes Mongoose, and stops the memory server.
- Factories/builders create minimal users/projects/tasks. Fixed names and unique per-test emails avoid cross-test dependence.
- Password-hash assertions inspect the persisted record through test-only model access and verify the plaintext is absent and bcrypt comparison succeeds.
- JWT tests use a dedicated test secret and fixed short payloads. Never print tokens.
- Time-sensitive deadline/overdue tests freeze or inject the clock and use UTC ISO values.
- Upload tests use small temporary fixtures in a test upload directory, verify metadata/cleanup, and remove their own files in teardown.
- Tests run deterministically in any order and do not depend on seed data.

### Client

- Vitest uses jsdom and React Testing Library.
- Render helpers wrap Router, Query Client, and authentication providers.
- Network behavior is mocked at the HTTP boundary (for example with MSW) using the documented envelopes.
- Each test receives a fresh Query Client with retries disabled to avoid timing noise.
- Interactions use accessible roles/labels through `userEvent`, not implementation selectors.
- Assertions cover what a user can see/do plus submitted API intent; backend authorization is tested separately on the server.

## Required backend cases

|   # | Required behavior                    | Minimum assertion                                                                   | Status     | Evidence |
| --: | ------------------------------------ | ----------------------------------------------------------------------------------- | ---------- | -------- |
|   1 | Successful registration              | `201`, normalized safe user, default active Team Member                             | NOT TESTED | —        |
|   2 | Duplicate email rejection            | Case-insensitive duplicate returns `409`; no second user                            | NOT TESTED | —        |
|   3 | Password is hashed                   | Persisted hash differs from plaintext; bcrypt compare succeeds; response omits hash | NOT TESTED | —        |
|   4 | Successful login                     | `200`, safe user, usable JWT                                                        | NOT TESTED | —        |
|   5 | Invalid login                        | Generic invalid-credentials response; no email/password disclosure                  | NOT TESTED | —        |
|   6 | Inactive user cannot log in          | Generic rejection and no JWT                                                        | NOT TESTED | —        |
|   7 | Missing JWT                          | Protected route returns `401` envelope                                              | NOT TESTED | —        |
|   8 | Invalid JWT                          | Malformed/bad-signature token returns `401` without internals                       | NOT TESTED | —        |
|   9 | Role authorization                   | Authenticated disallowed role receives `403`                                        | NOT TESTED | —        |
|  10 | Admin creates project                | Valid project persists and returns `201`                                            | NOT TESTED | —        |
|  11 | Unauthorized project creation        | Team Member/Project Manager cannot create; no record                                | NOT TESTED | —        |
|  12 | Invalid project deadline             | Deadline before start date returns field-level `400`                                | NOT TESTED | —        |
|  13 | Manager assigned-project restriction | Assigned project works; unrelated project is forbidden                              | NOT TESTED | —        |
|  14 | Add project member                   | Active user added exactly once                                                      | NOT TESTED | —        |
|  15 | Invalid/inactive member              | Invalid role/state/reference rejected without mutation                              | NOT TESTED | —        |
|  16 | Create task                          | Authorized create persists correct project/creator/default status                   | NOT TESTED | —        |
|  17 | Invalid task assignee                | Non-member/inactive assignee rejected                                               | NOT TESTED | —        |
|  18 | Team Member updates own task status  | Required transition succeeds and timestamps update                                  | NOT TESTED | —        |
|  19 | Team Member cannot delete task       | Returns `403`; task remains                                                         | NOT TESTED | —        |
|  20 | Search works                         | Matching users/projects/tasks returned; non-matches excluded; input safe            | NOT TESTED | —        |
|  21 | Filtering works                      | Enum/reference/date filters operate in backend query                                | NOT TESTED | —        |
|  22 | Pagination metadata                  | Counts/pages/next/previous are correct at boundaries                                | NOT TESTED | —        |
|  23 | Dashboard aggregation                | Frozen known dataset returns exact scoped totals/progress/overdue                   | NOT TESTED | —        |
|  24 | Audit event                          | Important successful action creates one safe expected log                           | NOT TESTED | —        |

Recommended authorization edge coverage includes inactive JWT users, Admin self-deactivation prevention, PM membership moderation outside assigned projects, Team Member reassign/delete/create attempts, comment ownership, attachment task access, audit Admin-only access, role-scoped dashboards, invalid ObjectIds, arbitrary sort fields, and excessive limits.

## Required frontend cases

|   # | Required behavior       | Minimum assertion                                                             | Status     | Evidence |
| --: | ----------------------- | ----------------------------------------------------------------------------- | ---------- | -------- |
|   1 | Login validation        | Invalid email/empty or short password shows field errors and no request       | NOT TESTED | —        |
|   2 | Registration validation | Required/name/email/password errors and valid submit intent                   | NOT TESTED | —        |
|   3 | Protected route         | Anonymous user is redirected to Login; authenticated user sees content        | NOT TESTED | —        |
|   4 | Role-based navigation   | Admin-only links hidden for member and shown for Admin                        | NOT TESTED | —        |
|   5 | Project interaction     | At least one real create/edit/member or list/filter mutation updates UI/cache | NOT TESTED | —        |
|   6 | Task status interaction | Allowed status change calls API and refreshes badge/data                      | NOT TESTED | —        |
|   7 | Loading/error state     | Skeleton/spinner then safe retryable error or content                         | NOT TESTED | —        |

Hiding actions is not a server security test. Client tests should also check labels, keyboard interaction, disabled duplicate submits, destructive confirmations, and empty pagination states where practical.

## Integration and manual suites

After automated checks pass, exercise the complete [DEMO.md](./DEMO.md) flow against seeded local services. Verify all three personas, manager/project membership boundaries, dashboard changes, audit logs, comment ownership, a supported attachment, attachment deletion, search/filter/pagination, Swagger, and safe `401`/`403` responses.

For upload validation, test:

- one allowed small file;
- an executable/disallowed MIME or extension;
- a file over `MAX_FILE_SIZE`;
- a hostile filename such as path segments (stored name remains safe);
- deletion when the physical file exists;
- deletion when metadata exists but the physical file is already missing.

## Result recording template

Record facts, not summaries:

```text
Date/time (timezone):
Commit/hash tested:
Environment versions:
Command:
Exit code:
Passed/failed/skipped counts:
Failure details or evidence link:
```

If a command was not run, its result is `NOT TESTED`, not assumed from another command. If infrastructure credentials are required, record `PENDING CREDENTIALS` in [FINAL_QA.md](./FINAL_QA.md). A flaky retry is a failure to investigate, not a pass to hide.

## Clean-state acceptance order

1. Install dependencies from the lockfile in a clean workspace.
2. Confirm test environment cannot resolve to production MongoDB.
3. Run lint and strict TypeScript/build checks.
4. Run server tests with isolated MongoDB.
5. Run client tests with isolated network mocks.
6. Run the full root test suite.
7. Build both production bundles.
8. Start local/Compose services and seed demo data.
9. Perform the mandatory end-to-end demo and security checks.
10. Copy exact evidence into `FINAL_QA.md`; never convert an unexecuted row to `PASS`.
