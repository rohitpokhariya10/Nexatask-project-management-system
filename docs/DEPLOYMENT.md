# CountryEdu NexaTask deployment guide

## Deployment status

**PENDING CREDENTIALS / NOT DEPLOYED BY THIS DOCUMENTATION TRACK.** No hosted URL, Docker result, health check, CORS check, login, database connection, or upload persistence has been verified here. Record real results only after execution.

## Environment contract

### Server

| Variable             | Required | Example (non-secret)             | Purpose                                                            |
| -------------------- | -------- | -------------------------------- | ------------------------------------------------------------------ |
| `NODE_ENV`           | Yes      | `production`                     | Runtime behavior and safe error policy                             |
| `PORT`               | Yes      | `5000`                           | API listen port; honor platform-injected port                      |
| `MONGODB_URI`        | Yes      | `mongodb://mongo:27017/nexatask` | MongoDB connection; use a secret in hosted environments            |
| `JWT_SECRET`         | Yes      | Do not document a real value     | Strong signing secret                                              |
| `JWT_EXPIRES_IN`     | Yes      | `1d`                             | Access-token lifetime                                              |
| `CLIENT_URL`         | Yes      | `https://app.example.com`        | Explicit CORS origin; support a validated list only if implemented |
| `BCRYPT_SALT_ROUNDS` | Yes      | `12`                             | Password hash cost, parsed/validated as an integer                 |
| `MAX_FILE_SIZE`      | Yes      | `5242880`                        | Maximum upload bytes                                               |
| `UPLOAD_DIRECTORY`   | Yes      | `/data/uploads`                  | Writable storage path outside source code                          |

### Client

| Variable            | Required | Example                       | Purpose                                |
| ------------------- | -------- | ----------------------------- | -------------------------------------- |
| `VITE_API_BASE_URL` | Yes      | `https://api.example.com/api` | API base compiled into the Vite bundle |

Use committed `.env.example` files for names/examples only. Store real secrets in the hosting provider's encrypted settings. Never expose `JWT_SECRET` or `MONGODB_URI` through a `VITE_` variable; Vite variables are public in the browser bundle.

## Local non-container run

Prerequisites: supported Node/npm versions and a reachable development MongoDB.

```bash
npm install
npm run seed
npm run dev
```

Create local `.env` files from the examples first and provide development-only values. Expected targets are client `http://localhost:5173`, API `http://localhost:5000`, health `http://localhost:5000/api/health`, and Swagger `http://localhost:5000/api/docs`; confirm actual ports from configuration. These URLs are targets, not verified results.

## Docker Compose

The target Compose topology contains:

- `mongo`: durable named volume, internal network, health check.
- `server`: built from `server/Dockerfile`, receives server environment, waits for Mongo readiness, exposes the API, and mounts a development/local upload volume.
- `client`: built from `client/Dockerfile`, receives the correct build-time API URL and serves the production Vite output or documented dev mode.

Run:

```bash
docker compose up --build
```

Then verify health, Swagger, all three logins, upload persistence across a server-container restart, and graceful shutdown. `depends_on` startup order alone does not prove MongoDB readiness; use health checks and retry-safe database connection logic. Docker has not been run as part of creating this guide.

## Hosted deployment reference path

### 1. MongoDB Atlas

1. Create a dedicated project/cluster and least-privilege application database user.
2. Configure network access for the backend host; do not open broader CIDRs than necessary.
3. Copy the SRV connection string into the backend secret `MONGODB_URI`.
4. Set retry/timeouts appropriate to the platform and verify the target database name.
5. Do not use production data for tests or seed the production database with demo credentials.

### 2. Backend on Render/Railway/a Node host

1. Select the repository and server/root build context consistent with the monorepo scripts.
2. Install from the lockfile and run the server production build.
3. Start the compiled server using the actual package script; do not use a development watcher.
4. Configure all server variables above and use the platform-provided `PORT` when present.
5. Set health check path to `/api/health` only after confirming it returns readiness without secrets.
6. Configure `CLIENT_URL` with the final HTTPS frontend origin, including no accidental path/wildcard mismatch.
7. Review logs for redaction and confirm shutdown/redeploy closes connections cleanly.

### 3. Attachment persistence decision

Many application hosts provide ephemeral filesystems. Local Multer storage on such a host can disappear on restart/redeploy and will not work consistently across multiple instances.

Before production deployment, choose one:

- mount a durable provider volume at `UPLOAD_DIRECTORY` and keep the service single-region/compatible with that volume; or
- replace the local storage adapter with object storage, retain server-side type/size checks, and store only safe object metadata/URLs in MongoDB.

Do not claim attachment durability until restart/redeploy tests prove it. Never serve the entire source tree or accept a client-provided storage path.

### 4. Frontend on Vercel/Netlify

1. Use the `client` build context or the root workspace command that builds the client.
2. Set `VITE_API_BASE_URL` to the final HTTPS API URL including `/api` exactly once.
3. Configure SPA rewrites so deep routes return `index.html`, while static assets remain cacheable.
4. Deploy, then add the exact frontend origin to backend CORS configuration and redeploy the API if needed.
5. Verify login refresh/logout, protected deep links, API errors, charts, and mobile navigation.

## Production verification

All rows start unverified.

| Check                                                                     | Initial status      | Evidence to record                 |
| ------------------------------------------------------------------------- | ------------------- | ---------------------------------- |
| Atlas connects over TLS with least-privilege credentials                  | PENDING CREDENTIALS | Provider/health timestamp, no URI  |
| Backend build and start command succeed                                   | NOT TESTED          | Build logs and release ID          |
| `/api/health` is healthy and contains no sensitive data                   | NOT TESTED          | Status/body excerpt                |
| `/api/docs` loads over HTTPS                                              | NOT TESTED          | URL/screenshot                     |
| Frontend production build and SPA rewrites work                           | NOT TESTED          | Build log and deep-link URL        |
| Browser calls the intended API URL without mixed content                  | NOT TESTED          | Network evidence                   |
| CORS permits only intended origins/methods/headers                        | NOT TESTED          | Allowed and rejected-origin checks |
| Register/login/me work; inactive login is rejected                        | NOT TESTED          | Safe request IDs/results           |
| All three role scopes and representative `403` behavior work              | NOT TESTED          | Endpoint matrix evidence           |
| Seed/demo data is absent from production unless explicitly intended       | NOT TESTED          | Database/release check             |
| Upload allowlist/size/path protections work                               | NOT TESTED          | Sanitized test results             |
| Attachment survives restart/redeploy or limitation is explicitly accepted | NOT TESTED          | Persistence result                 |
| Logs redact passwords, Authorization/JWT, secrets, and filesystem paths   | NOT TESTED          | Redacted log review                |
| Dashboard data is role-scoped and matches known records                   | NOT TESTED          | Count comparison                   |
| Audit records are safe and Admin-only                                     | NOT TESTED          | Access and content checks          |

## Rollback and operations

- Keep deploys immutable and identify the last healthy release.
- Roll back application code through the hosting provider or a normal Git revert; do not rewrite shared history.
- Schema changes should remain backward-compatible for at least one deploy. This design uses Mongoose documents rather than a migration framework, so model/default changes need an explicit data backfill plan when required.
- Back up MongoDB before destructive data changes and verify restore procedures outside production first.
- Rotating `JWT_SECRET` invalidates existing access tokens; schedule and communicate that effect.
- Rotate a suspected database credential immediately and review access logs without publishing the secret.
- Monitor health, error rate, response latency, MongoDB connection saturation, disk/object-storage usage, and rate-limit anomalies.

## Release gate

Deployment is not complete until the clean install, lint, tests, client/server builds, local integration, Docker (where possible), hosted health, login, CORS, role authorization, uploads, Swagger, and mandatory demo flow have evidence in [FINAL_QA.md](./FINAL_QA.md). Missing provider access remains `PENDING CREDENTIALS`; it must never be reported as a successful deployment.
