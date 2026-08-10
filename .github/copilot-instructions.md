# YEMS Copilot Instructions

## Build, test, and lint commands

Use **Bun** in this repository.

| Task | Command |
| --- | --- |
| Install workspace deps | `bun install` |
| Run full test entrypoint (root) | `bun run test` |
| Run backend tests only | `bun run --cwd packages/backend test` |
| Run a single backend test file | `bun run --cwd packages/backend test src/modules/exams/exams.test.ts` |
| Run a single backend test by name | `bun run --cwd packages/backend test src/modules/exams/exams.test.ts -t "should return exam when found"` |
| Run backend coverage | `bun run --cwd packages/backend test:coverage` |
| Lint backend | `bun run --cwd packages/backend lint` |
| Auto-fix backend lint issues | `bun run --cwd packages/backend lint:fix` |
| Build backend TypeScript | `bun run --cwd packages/backend build` |
| Start full stack (Docker) | `docker compose up -d` |

Frontend currently has no real automated test/lint/build pipeline (its `test` script is a no-op).

## High-level architecture

- Monorepo with two main workspaces: `packages/frontend` (vanilla JS multi-page portal) and `packages/backend` (Hono + TypeScript API with Drizzle/Postgres).
- Runtime/deployment path is Docker + Caddy (`docker-compose.yml`, `Caddyfile`): Caddy proxies `/api/*` (plus `/health`, `/metrics`, `/status/metrics`, `/docs/*`) to backend and all other routes to frontend.
- Backend startup (`packages/backend/src/main.ts`) creates the Hono app (`app/app.ts`), registers module routes (`app/routes.ts`), validates env (`config/env.ts` + `shared/validators/env.validator.ts`), initializes MinIO bucket (`config/storage.ts`), and starts Redis/BullMQ email worker (`modules/email/*`, `queue/redis.ts`).
- Backend domain modules follow route/service/repo/schema/test layering under `src/modules/*`, with database tables defined in `src/db/schema/*`.
- Frontend is script-composed (see `index.html`/`admin.html` script tags): `config.js` sets API base URL, `api.js` wraps HTTP calls, `auth.js` manages session/JWT handling, and `data.js` + `DataSync` maintain an in-memory cache used by portal pages.

## Key conventions in this codebase

- **Response envelope:** backend routes consistently return `{ success: true, data }` for success and `{ success: false, message, ... }` for failures.
- **RBAC enforcement:** protected routes use `authMiddleware` with `requirePermission(PERMISSIONS.*)` or `requireRole(...)` from `app/middleware.ts` and `shared/constants/permissions.ts`.
- **Validation and errors:** route handlers parse input with Zod `safeParse(...)` and throw typed `AppError` subclasses (`BadRequestError`, `NotFoundError`, etc.) for centralized error handling.
- **Frontend state model:** use `window.__YEMS_DATA_CACHE` through helpers in `data.js` (`get*`, `save*`, `DataSync.refreshResource/refreshCore`) rather than introducing ad-hoc client state stores.
- **Portal boot pattern:** each portal script (`app.js`, `admin.js`, `teacher.js`, `superadmin.js`, `accountant.js`) bootstraps via an IIFE that checks role/session, registers hash routes with `Router.register(...)`, then starts routing.
- **API base URL convention:** frontend determines API base from runtime (`/api` behind Caddy on standard ports, `http://<host>:4000/api` on local dev ports) in `js/config.js`; keep new client calls aligned with this.
- **Env strictness:** backend startup hard-validates env with Zod (`env.validator.ts`), including `JWT_SECRET` minimum length (32+); missing/invalid values terminate startup.
