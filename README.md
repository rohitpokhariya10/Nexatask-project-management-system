# CountryEdu NexaTask

CountryEdu NexaTask is a full-stack project and task management system for organizations that
need clear ownership, role-aware collaboration, deadline tracking, comments, attachments, audit
history, and actionable delivery analytics.

## Evaluator quick path

| Resource           | Direct link                                                                                                                                                                                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub repository  | [Nexatask-project-management-system](https://github.com/rohitpokhariya10/Nexatask-project-management-system)                                                                                                                                                                          |
| Application source | [React client](https://github.com/rohitpokhariya10/Nexatask-project-management-system/tree/main/client/src) · [Express server](https://github.com/rohitpokhariya10/Nexatask-project-management-system/tree/main/server/src)                                                           |
| Data model         | [Implemented database schema](docs/DATABASE_SCHEMA.md) · [Mermaid ER diagram](docs/ERD.md)                                                                                                                                                                                            |
| API resources      | [API guide](docs/API.md) · [Postman collection](docs/postman/CountryEdu-NexaTask.postman_collection.json) · [raw Postman import](https://raw.githubusercontent.com/rohitpokhariya10/Nexatask-project-management-system/main/docs/postman/CountryEdu-NexaTask.postman_collection.json) |
| Submission index   | [All deliverables and current status](docs/DELIVERABLES.md)                                                                                                                                                                                                                           |

For a local evaluation, start MongoDB 7+, replace the example development JWT secret, and run:

```bash
npm install
cp server/.env.example server/.env
cp client/.env.example client/.env
npm run seed
npm run dev
```

`npm run seed` replaces all records in the configured non-production database. Use it only with a
disposable local database. Then open:

| Local target    | URL                                                                        |
| --------------- | -------------------------------------------------------------------------- |
| Web application | [http://localhost:5173](http://localhost:5173)                             |
| API health      | [http://localhost:5000/api/health](http://localhost:5000/api/health)       |
| Swagger UI      | [http://localhost:5000/api/docs](http://localhost:5000/api/docs)           |
| OpenAPI JSON    | [http://localhost:5000/api/docs.json](http://localhost:5000/api/docs.json) |

Admin login: `admin@nexatask.demo` / `Demo@12345`. The remaining seeded personas are listed in
[Seed data and demo credentials](#seed-data-and-demo-credentials). A public deployment URL is not
claimed; provider login is still required.

## Main features

- JWT registration, login, current-user sessions, and secure bcrypt password hashing
- Server-enforced `ADMIN`, `PROJECT_MANAGER`, and `TEAM_MEMBER` permissions
- Project lifecycle, manager assignment, member management, deadlines, search, filters, sorting,
  and pagination
- Task creation, assignment, priorities, due dates, status workflow, My Tasks, and project progress
- Task comments and validated local file attachments
- Role-scoped dashboards backed by MongoDB aggregation
- Administrative user management and persistent audit logs
- Responsive React dashboard with loading, empty, error, confirmation, and toast feedback
- Swagger/OpenAPI documentation and a ready-to-import Postman collection
- API and UI test suites, development seed data, and Render/Vercel deployment configuration

## Role permissions

| Capability                      | Admin            | Project Manager   | Team Member        |
| ------------------------------- | ---------------- | ----------------- | ------------------ |
| Manage users and roles          | Yes              | No                | No                 |
| Create/delete projects          | Any project      | No                | No                 |
| Update projects                 | Any project      | Assigned projects | No                 |
| Manage project members          | Any project      | Assigned projects | No                 |
| Create, assign, or delete tasks | Any project      | Assigned projects | No                 |
| Update task status              | Any task         | Assigned projects | Own assigned tasks |
| Comment and attach files        | Accessible tasks | Assigned projects | Accessible tasks   |
| View dashboard                  | Organization     | Assigned projects | Relevant work      |
| View organization audit log     | Yes              | No                | No                 |

The API is the final authorization authority. Client-side route and button guards are usability
controls only.

## Technology stack

- Client: React, TypeScript, Vite, React Router, Tailwind CSS, TanStack Query, React Hook Form,
  Zod, Axios, Recharts, Lucide React, Sonner, Vitest, and React Testing Library
- Server: Node.js, Express, TypeScript, MongoDB, Mongoose, Zod, JWT, bcrypt, Multer, Helmet,
  CORS, Morgan, rate limiting, Swagger, Vitest, Supertest, and MongoDB Memory Server
- Tooling: npm workspaces, ESLint, Prettier, Postman, Mermaid, Render, and Vercel

## Architecture

The npm-workspace monorepo has three main surfaces:

```text
Browser (React/Vite)
        |
        | HTTPS + Bearer JWT
        v
Express REST API ---- local upload storage
        |
        v
     MongoDB
```

The client keeps remote state in TanStack Query and sends requests through one Axios client. The
server validates requests with Zod, resolves identity from JWTs, applies role and resource-access
checks, then uses Mongoose models and aggregation pipelines. See
[Architecture](docs/ARCHITECTURE.md) and [ER diagram](docs/ERD.md).

## Project structure

```text
countryedu-nexatask/
├── client/                 React/Vite frontend
├── server/                 Express/Mongoose API
├── docs/                   Architecture, API, QA, and operating guides
├── render.yaml             Render API Blueprint
├── AGENTS.md               Repository contribution rules
├── package.json            Root workspace commands
└── README.md
```

## Local setup

Prerequisites: Node.js 20.19+ (or 22.12+), npm 10+, and MongoDB 7+.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment templates:

   ```bash
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   ```

3. Replace the development JWT secret, confirm the MongoDB URL in `server/.env`, and start
   MongoDB before seeding.

4. Seed demo data:

   ```bash
   npm run seed
   ```

5. Start both applications:

   ```bash
   npm run dev
   ```

The client runs at `http://localhost:5173`, the API at `http://localhost:5000`, the health check at
`http://localhost:5000/api/health`, and Swagger at `http://localhost:5000/api/docs`.

### Root commands

| Command                | Purpose                          |
| ---------------------- | -------------------------------- |
| `npm run dev`          | Start client and server together |
| `npm run dev:client`   | Start only the Vite client       |
| `npm run dev:server`   | Start only the Express API       |
| `npm run build`        | Build server, then client        |
| `npm run lint`         | Lint both workspaces             |
| `npm run test`         | Run server and client tests      |
| `npm run test:client`  | Run frontend tests               |
| `npm run test:server`  | Run backend tests                |
| `npm run seed`         | Replace development demo data    |
| `npm run format:check` | Check repository formatting      |

## Environment variables

Server variables are documented in `server/.env.example`:

- `NODE_ENV`, `PORT`, and `MONGODB_URI`
- `JWT_SECRET` and `JWT_EXPIRES_IN`
- `CLIENT_URL`, `BCRYPT_SALT_ROUNDS`, `MAX_FILE_SIZE`, and `UPLOAD_DIRECTORY`
- `AUTO_INDEX`
- `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` for the first hosted Admin

Client variables are documented in `client/.env.example`:

- `VITE_API_BASE_URL`
- `VITE_API_PROXY_TARGET` and `VITE_DEV_PORT`
- `VITE_MAX_UPLOAD_BYTES`

Real `.env` files are ignored. Never commit production credentials.

The client port and API target are configurable for local development. `CLIENT_URL` accepts a
comma-separated explicit origin list; keep it
aligned with the browser URL, including whether it uses `localhost` or `127.0.0.1`.

## Seed data and demo credentials

The seed command creates two projects, representative memberships, tasks across statuses and
priorities, upcoming and overdue work, and comments. These credentials are for local development
only:

| Role            | Email                   | Password     |
| --------------- | ----------------------- | ------------ |
| Admin           | `admin@nexatask.demo`   | `Demo@12345` |
| Project Manager | `manager@nexatask.demo` | `Demo@12345` |
| Team Member     | `member1@nexatask.demo` | `Demo@12345` |
| Team Member     | `member2@nexatask.demo` | `Demo@12345` |
| Team Member     | `member3@nexatask.demo` | `Demo@12345` |

## Hosting

The supported deployment is a Render web service for the Express API, Vercel for the React/Vite
client, and MongoDB Atlas for data. The repository contains a Render Blueprint at `render.yaml` and
Vercel project configuration at `client/vercel.json`. Follow the exact environment, first-Admin,
CORS, and attachment-persistence steps in [Deployment](docs/DEPLOYMENT.md).

## Testing

```bash
npm run lint
npm run test
npm run build
```

Server integration tests use MongoDB Memory Server, never a production database. Client tests run
with Vitest, jsdom, and React Testing Library. See the [testing guide](docs/TESTING.md) for scope and
commands and [Final QA](docs/FINAL_QA.md) for recorded run evidence. Re-run the commands above when
evaluating the current checkout.

## Screenshots

The responsive application screens are available from the local seeded demo rather than represented
by generated mockups. Start the stack, sign in with a demo persona, and open these reproducible
views:

| Screen                  | Local route                              |
| ----------------------- | ---------------------------------------- |
| Dashboard and analytics | `http://localhost:5173/dashboard`        |
| Project workspace       | `http://localhost:5173/projects`         |
| Personal task queue     | `http://localhost:5173/tasks`            |
| Admin user management   | `http://localhost:5173/admin/users`      |
| Admin audit history     | `http://localhost:5173/admin/audit-logs` |

The repository documents reproducible screens instead of bundling stale captures from a different
build. The routes above render the implemented application after the documented seed command.

## API summary

The REST API is rooted at `/api` and includes:

- `/auth`, `/users`, `/projects`, `/tasks`, `/comments`, and `/attachments`
- `/dashboard` role-scoped analytics
- `/audit-logs` administrator-only audit history
- `/docs` Swagger UI and `/health` service health

Responses use a consistent `success`, `message`, `data`, `errors`, and optional `pagination`
structure. Full endpoint details are in the [API guide](docs/API.md). Import the
[Postman collection](docs/postman/CountryEdu-NexaTask.postman_collection.json) or use its
[raw import URL](https://raw.githubusercontent.com/rohitpokhariya10/Nexatask-project-management-system/main/docs/postman/CountryEdu-NexaTask.postman_collection.json).

## Deployment

The repository contains deployment-ready Render API and Vercel client configuration plus exact
setup guidance in [Deployment](docs/DEPLOYMENT.md). A public deployment has not been created because
provider login is unavailable; no public frontend or API URL is claimed.

## Security note

For this hackathon build, the client stores the returned JWT in `localStorage`. This is simple and
works across refreshes, but it is accessible to JavaScript and therefore not completely secure
against an XSS compromise. A production evolution should use short-lived access tokens with a
secure, `HttpOnly`, `SameSite` refresh-token cookie, token rotation, and a restrictive Content
Security Policy.

## Known limitations

- Attachments use server-local disk storage; horizontally scaled production deployments need
  object storage.
- JWT refresh-token rotation and account password recovery are not included.
- Public deployment and cross-origin production verification are blocked pending provider login.
- Email notifications and real-time collaboration are outside this hackathon scope.

## Future improvements

- S3-compatible object storage and malware scanning for attachments
- Short-lived access tokens, rotating refresh cookies, and password recovery
- WebSocket activity updates and optional email reminders
- Saved filters, notification preferences, and richer accessibility audits
- Automated deployment pipelines and browser-based end-to-end regression tests

## Additional documentation

- [Original requirement checklist (archived baseline)](docs/CHECKLIST.md)
- [Deliverables index](docs/DELIVERABLES.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Implemented database schema](docs/DATABASE_SCHEMA.md)
- [Database ERD](docs/ERD.md)
- [API guide](docs/API.md)
- [Testing guide](docs/TESTING.md)
- [Deployment guide](docs/DEPLOYMENT.md)
- [Demo flow](docs/DEMO.md)
- [Final QA](docs/FINAL_QA.md)
