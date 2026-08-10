# YEMS Agent Guide

This file is the repository-level orientation for future coding agents. Read it before exploring the project; inspect the relevant package files only after identifying the scope of a task.

## Repository at a glance

YEMS (Yeshua Educational Management System) is a Bun workspace monorepo for a role-based school management platform.

```text
packages/
  backend/             Active Hono REST API (TypeScript, Drizzle, PostgreSQL)
  frontend/            Active Next.js 16 / React 19 portal UI
  deprecated-frontend/ Legacy static HTML/CSS/vanilla-JS frontend; avoid new work here
  browser/             Small Electron/TypeScript utility
nginx/                 Production reverse proxy and error pages
docker-compose.yml     PostgreSQL, Redis, MinIO, backend, frontend, nginx
```

The root workspace is private and uses `packages/*` workspaces. The canonical package manager/runtime is **Bun**. `bun.lock` is authoritative; do not introduce a separate package-lock change unless required by the task.

## Important commands

From the repository root:

```bash
bun install
bun run dev                 # frontend development server
bun run dev:frontend
bun run dev:backend
bun run test                # frontend script, then backend tests
docker compose up -d        # full local service stack
```

Backend (`packages/backend`):

```bash
bun run dev                 # tsx watch src/main.ts
bun run build               # TypeScript compile
bun run test                # Vitest
bun run test:coverage
bun run lint
bun run lint:fix
bun run format
bun run db:generate         # create Drizzle migration
bun run db:migrate
bun run db:push
bun run db:seed             # uses the root students.csv/demo data
```

Frontend (`packages/frontend`): `bun run dev`, `bun run build`, `bun run start`, and `bun run lint`. There is no meaningful frontend test script currently; do not assume root `bun run test` provides frontend coverage.

## Backend architecture

- Entry point: `packages/backend/src/main.ts`. It validates env, creates the Hono app, initializes MinIO and Redis, and starts email/submission workers.
- App setup: `src/app/app.ts` configures CORS, security headers, body limits, rate limiting, audit middleware, and centralized errors.
- Route registration: `src/app/routes.ts`; new API modules must be registered here.
- Configuration: `src/config/` (`env.ts`, `db.ts`, `storage.ts`, `logger.ts`). Environment validation is strict and startup exits on invalid values; `JWT_SECRET` must be at least 32 characters.
- Database: Drizzle schemas live in `src/db/schema/`; migrations are in `migrations/`. Schema changes require a migration workflow and care with existing data.
- Domain modules: `src/modules/<feature>/` generally uses `*.routes.ts`, `*.service.ts`, `*.repo.ts`, optional `*.schema.ts`, and tests. Existing areas include auth, users, admissions, assignments, exams, lessons, lesson-plans, midterm-results, notes, notifications, reports, results, schemes, storage, submissions, and role portals (admin, teacher, student, accountant, technician, superadmin).
- Shared code: `src/shared/` contains permissions/constants, typed errors, auth types/utilities, and validators. Queue integrations are in `src/queue/` and email/submission workers under their modules.

Backend conventions:

- Successful API responses normally use `{ success: true, data }`; failures use `{ success: false, message, ... }`.
- Protect routes with the existing auth middleware and `requirePermission(...)` / `requireRole(...)` from `src/app/middleware.ts` and `src/shared/constants/permissions.ts`.
- Validate request bodies/params with Zod `safeParse`; use typed `AppError` subclasses and the centralized error handler instead of ad-hoc error responses.
- Keep route handlers thin: validation/auth at the route boundary, business logic in services, persistence in repositories.
- Add/update Vitest tests beside the affected module and run the narrow test first, then the backend suite.

## Frontend architecture

The active UI uses Next.js App Router under `packages/frontend/src/app/` with portals for `admin`, `teacher`, `student`, `accountant`, `technician`, and `parent`, plus login and shared error/layout pages.

- Shared shell/navigation: `src/components/layout/`.
- Reusable primitives: `src/components/ui/`.
- API client and typed resource calls: `src/lib/api/`; authentication context: `src/lib/auth/AuthContext.tsx`.
- API rewrites are configured in `next.config.ts`. Local fallback is `http://127.0.0.1:4000/api` (keep IPv4 fallback; Windows/Docker can mishandle `localhost`). Runtime `NEXT_PUBLIC_API_BASE_URL` or `API_BASE_URL` overrides it.
- Follow existing portal/page and component patterns. Keep authorization aligned with backend roles and permissions; do not duplicate backend business rules in the UI.

## Services and deployment

`docker-compose.yml` defines PostgreSQL 16, Redis 7 (password-protected), MinIO, backend, frontend, and nginx. Nginx terminates HTTP/HTTPS and proxies API/health routes to the backend and other traffic to the frontend. Check `nginx/nginx.conf`, `.env.example`, `deployment.md`, and `README.md` before changing deployment behavior.

Never commit secrets from `.env`, private keys, uploaded data, or generated logs. Use `.env.example` for documented configuration. The repository currently contains local/working-tree changes; preserve unrelated edits and inspect `git status` before modifying overlapping files.

## Change checklist

1. Identify whether the change belongs to backend, active frontend, deployment, or legacy code.
2. Read the target module and its nearest test/config before editing.
3. Preserve response envelopes, RBAC, validation, and existing naming/layering conventions.
4. For schema changes, generate/apply a Drizzle migration and verify migration metadata.
5. Run the narrowest relevant test/lint/build command, then broader checks when practical.
6. Report any environment-dependent checks (PostgreSQL, Redis, MinIO, SMTP) that could not run.

