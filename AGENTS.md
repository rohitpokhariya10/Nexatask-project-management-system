# CountryEdu NexaTask contribution guide

## Working agreement

- Work directly on `main`; never rewrite published history.
- Keep commits focused and use Conventional Commit messages.
- Preserve strict TypeScript and avoid `any` unless an integration genuinely requires it.
- Keep route handlers small, business rules in services/helpers, and authorization on the server.
- Validate API inputs with Zod and client forms with React Hook Form plus Zod.
- Never commit `.env` files, credentials, tokens, passwords, or generated uploads.
- Run the relevant lint, tests, and build checks before each commit.

## Repository map

- `client/`: React/Vite application.
- `server/`: Express/MongoDB API.
- `docs/`: architecture, API, testing, deployment, demo, QA, and Postman resources.

## Response conventions

API successes use `{ success: true, data, message? }`. Errors use
`{ success: false, message, errors: [] }`. The API must never serialize password
hashes or internal error details.
