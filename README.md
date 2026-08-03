# CountryEdu NexaTask

CountryEdu NexaTask is a full-stack project and task management system for organizations that
need clear ownership, role-aware collaboration, deadline tracking, comments, attachments, audit
history, and actionable delivery analytics.

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
- API and UI test suites, development seed data, and Docker Compose support

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
- Tooling: npm workspaces, ESLint, Prettier, Docker, Docker Compose, Postman, and Mermaid

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
├── AGENTS.md               Repository contribution rules
├── docker-compose.yml      MongoDB, API, and frontend services
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

Client variables are documented in `client/.env.example`:

- `VITE_API_BASE_URL`
- `VITE_MAX_UPLOAD_BYTES`

Real `.env` files are ignored. Never commit production credentials.

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

## Docker

Docker Compose is intended for local demonstration. Generate a strong `JWT_SECRET`, then build and
run MongoDB, the API, and the web client:

```bash
export JWT_SECRET="$(openssl rand -base64 32)"
docker compose up --build
```

Service health checks and persisted MongoDB/upload volumes are defined in `docker-compose.yml`.
To load the demo records into the running Compose database:

```bash
docker compose --profile tools run --rm seed
```

See [Deployment](docs/DEPLOYMENT.md) for production considerations.

## Testing

```bash
npm run lint
npm run test
npm run build
```

Server integration tests use MongoDB Memory Server, never a production database. Client tests run
with Vitest, jsdom, and React Testing Library. See [Testing](docs/TESTING.md) and the truthful
[Final QA record](docs/FINAL_QA.md).

## API summary

The REST API is rooted at `/api` and includes:

- `/auth`, `/users`, `/projects`, `/tasks`, `/comments`, and `/attachments`
- `/dashboard` role-scoped analytics
- `/audit-logs` administrator-only audit history
- `/docs` Swagger UI and `/health` service health

Responses use a consistent `success`, `message`, `data`, `errors`, and optional `pagination`
structure. Full endpoint details are in [API guide](docs/API.md). Import
`docs/postman/CountryEdu-NexaTask.postman_collection.json` for an executable request collection.

## Screenshots

Screenshots will be added after a hosted deployment is available and visually verified.

## Deployment

The documented target is a static host such as Vercel or Netlify for the client, a Node-compatible
host such as Render or Railway for the server, and MongoDB Atlas. Hosted build, SPA rewrites, CORS,
and runtime health must be verified with deployment credentials before calling it deployed. Follow
[Deployment](docs/DEPLOYMENT.md).

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
- Hosted deployment and cross-origin production verification remain pending credentials.
- Email notifications and real-time collaboration are outside this hackathon scope.

## Future improvements

- S3-compatible object storage and malware scanning for attachments
- Short-lived access tokens, rotating refresh cookies, and password recovery
- WebSocket activity updates and optional email reminders
- Saved filters, notification preferences, and richer accessibility audits
- Automated deployment pipelines and browser-based end-to-end regression tests

## Additional documentation

- [Implementation checklist](docs/CHECKLIST.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Database ERD](docs/ERD.md)
- [API guide](docs/API.md)
- [Testing guide](docs/TESTING.md)
- [Deployment guide](docs/DEPLOYMENT.md)
- [Demo flow](docs/DEMO.md)
- [Final QA](docs/FINAL_QA.md)
