# YEMS Codebase Review

**Yeshua Educational Management System** — a monorepo school platform: Hono/Drizzle/Postgres backend (~10.9k LOC), Next.js 16/React 19 frontend (~17.7k LOC), an Electron browser wrapper, and a retired vanilla-JS frontend. Nine roles, ~24 tables, exam/grading/billing/admissions workflows.

**Review date:** 2026-08-04

Bottom line: **ambitious and surprisingly complete in surface area — nearly every page and endpoint exists — but it is not shippable.** There are real, verified security breaches in the repo itself, the exam auto-grading is fake, and the authorization model is functionally broken for the main admin roles.

## Overall rating: 5/10 (solid prototype, not production-ready)

| Area | Score | Note |
|---|---|---|
| Feature completeness / breadth | 8/10 | All portals + pages built, real API wiring |
| Frontend UI/UX | 7/10 | Cohesive design system, good exam UX; a11y & dark-mode gaps |
| Backend architecture | 6/10 | Clean routes/service/repo layering, but critical logic gaps |
| Correctness (grading/auth) | 3/10 | Random grading, broken permissions |
| Security & secrets hygiene | 2/10 | Private key + plaintext student passwords in git |
| Data model integrity | 3/10 | No FKs, no indexes, no multi-tenancy |
| Testing | 3/10 | 12 test files; auth/middleware/routes untested |
| DevOps / deployment | 3/10 | Four conflicting proxy configs, broken compose build |

---

## 🔴 CRITICAL — Security & secrets (verified)

1. **TLS private key committed to git.** `ssl/yems.key` is a real PEM private key (with `ssl/yems.crt`, a Cloudflare Origin cert valid ~10 years). Anyone with repo access can impersonate/MITM the origin. **Must be revoked/reissued**, not just deleted.
2. **465 real students' data + plaintext passwords in git.** `students.csv` has a `Password` column — confirmed 440 distinct human-readable plaintext passwords, present in git history (commits `251c4d5`, `f467812`). Named-minor PII + live credentials. Requires history purge **and** password rotation.
3. **Redis dumps committed** — `dump.rdb` and `packages/browser/dump.rdb` (can contain tokens/queued PII).
4. **Junk tracked in git:** `.~lock.students.csv#` (LibreOffice lock), `admin.html.backup`, committed `dist/`.
   - *(Good news: the actual `.env` files are correctly gitignored.)*

## 🔴 CRITICAL — Backend correctness

5. **Exam auto-grading is a random number generator.** `packages/backend/src/modules/submissions/submissions.worker.ts:52` → `Math.floor(Math.random() * 100)`. Every submission through `POST /api/submissions` gets a random score.
6. **Hardcoded mock answer key in the live exam-submit route.** `packages/backend/src/modules/exams/exams.routes.ts:139` grades any exam lacking DB questions against 5 fixed strings (`O(log N)`, `IMAP`, …). Its denominator is also broken (`totalScore` starts at 10 then `+= 2` ×5 → a perfect paper scores 50% → "C").
7. **Client-supplied score is trusted** (`packages/backend/src/modules/submissions/submissions.repo.ts`): a student can POST `score:100`; it persists if the grading queue enqueue fails (which is swallowed silently).
8. **Authorization model is broken for admin/principal/hod** (verified). `hasPermission` (`shared/constants/permissions.ts:291`) does exact-string matching; these roles hold only `*_MANAGE`+`*_READ`, but write routes require `*_CREATE/UPDATE/DELETE`. Net effect: **only superadmin can create/update/delete exams, results, assignments, admissions, etc.** Core admin workflows fail.
9. **Rate-limit bypass via forged token** (verified). `packages/backend/src/app/middleware.ts:124` uses `jwt.decode` (no signature check) to exempt `admin/superadmin/principal/technician` from rate limiting. A forged unsigned `{"role":"admin"}` token disables rate limiting on all `/api/*`.

## 🟠 HIGH — Backend

- **No foreign keys anywhere** — every relation is a bare `varchar(36)`. No referential integrity; orphaned rows on delete.
- **No indexes** on any lookup column, incl. `refresh_tokens.userId` (hit on every request) — full scans at scale.
- **No multi-tenancy** — zero `institutionId` columns despite an `institutions` table; tenant isolation impossible at DB layer, and `users.email` is globally unique.
- **Two divergent grading systems** (`/submissions` vs `/exams/submit`) with different semantics; exam-submit has no retake guard (unlimited result rows).
- Grading ignores `passingScore`; there is no failing grade (min is "C").
- Public `/storage/public/:folder/:fileName` served unauthenticated — confirm path-traversal is blocked.
- Missing zod validation on most write routes (mass-assignment risk on user create/update; `Number(amount)` with no NaN guard).
- No global auth middleware — protection is per-route, so any forgotten route is silently public.
- Queue-failure path leaves submissions permanently ungraded (error logged, request returns success, no retry/status flag).

## 🟠 HIGH — Frontend

- **Hardcoded `http://localhost:4000/api`** in `next.config.ts` and `client.ts` fallback — breaks any non-local deploy.
- **Global telemetry captures every mousemove + keypress** for all authenticated users (`src/lib/auth/AuthContext.tsx:99-148`) and POSTs to `/technician/telemetry/event`. No consent; a privacy and performance liability.
- **Fabricated analytics chart** — `technician/analytics` memory trend is synthetic (subtracts hardcoded offsets from current value).
- Invalid Tailwind classes silently no-op: `text-gray-955`, `bg-maroon-hover`, `border-border-hover` — intended hover states don't render.
- Broken login links: "Apply for Admission" → `/admin/admission` (missing 's'); "Super Admin Access" → `/login` (loops to itself).
- **~20 a11y violations**: `<div onClick>` rows with no keyboard handler/role, icon-only buttons with no `aria-label`, unlabeled search/filter inputs, charts with no text alternative and light-mode-only axis colors.
- 7 files use `window.location.reload()` after updates; `window.confirm`/`alert` used despite an existing `ConfirmModal`.
- Code duplication: `getNigerianGrade`/`getGradePoints` in 3 files; profile-picture upload logic duplicated across 6 settings pages.

## 🟡 Missing components (frontend design system)

The design system is more complete than typical. **Present:** Card/StatCard, Button (6 variants), Input/Select/Textarea, Table (loading + empty states), Badge, Modal/ConfirmModal, Toaster (wired globally).

**Missing:**
- Dropdown/Popover
- Tabs
- **Pagination** (tables load full dataset; admin users pulls up to 10,000 rows)
- Tooltip
- Skeleton component (CSS class only, no wrapper)
- Unified Spinner
- Progress (with aria)
- Switch/Toggle
- Avatar
- Persistent Alert/Banner
- Breadcrumb
- DatePicker/TimePicker
- Combobox/Autocomplete
- Form-validation abstraction (per-field manual validation only)
- Topbar search is UI-only (not wired)

## 🟡 MEDIUM — Infra / config / deployment

- **Four conflicting reverse-proxy configs** (`docker-compose.yml`, `Caddyfile`, `nginx/nginx.conf`, `yems.conf`) — nginx is a copy-paste from an unrelated "fileshare" project; only `yems.conf` does TLS. `docker-compose.yml` builds a `packages/frontend/Dockerfile` **that doesn't exist** → build fails. Redis port typo (`6979` in `.env` vs `6379` exposed).
- `deployment.md` designs the whole LAN as **plaintext HTTP** — contradicts the TLS config.
- Dockerfiles `COPY . .` and run as **root**, no `.dockerignore`.
- Electron wrapper: good `contextIsolation`/`nodeIntegration:false`, but `sandbox:false`, loads arbitrary URLs into an iframe, and an IPC handler returns **all session cookies** to the renderer — a cookie-exfil path.
- **No CI** (`.github/` has only copilot instructions — no workflows, no secret scanning).
- Weak change-password policy (≥6 chars vs 8+complexity at register); no session revocation on password change.
- ~445MB × 2 offline `.tar` files in the working tree (gitignored but present); deprecated-frontend (~30 JS files + a scraped "WAEC answers" asset dump) still tracked.
- Backend binds hardcoded port `4001` ignoring `env.PORT`; auto-links a specific parent→student UUID on every boot (`main.ts`).
- Metrics/health endpoints are unauthenticated and leak DB/storage/queue status; several return hardcoded zeros.

## 🟡 MEDIUM — Data model

- Free-text status fields (`bills.status`, `payments.status`, `reports.status`) with no enum/CHECK constraints.
- Money/score integer columns have no `>= 0` check.
- Missing natural-key unique constraints (e.g. `results (studentId, subject, term, session)` → duplicate rows).
- IDs are `varchar(36)` not native `uuid`; dates stored as `varchar(20)` in several tables.
- Denormalized `studentName`/`class` snapshots will drift given no FKs.
- Only one DB transaction in the entire codebase — multi-step writes are non-atomic.

## Test coverage

12 test files exist. **Tested (partially):** admissions, auth (schema only), exams, lesson-plans, lessons, midterm-results, notifications, reports, results, schemes, submissions, users (schema only).

**Critical untested paths:**
- Auth service/lockout/repo — only `auth.schema.test.ts` exists; login, refresh rotation, lockout, JWT logic untested.
- Middleware — `authMiddleware`, `requirePermission`, rate limiting: no tests (would have caught the authz + rate-limit bugs).
- No route-level/integration tests anywhere; admin, teacher, student, accountant, superadmin, technician, storage, notes, assignments modules have zero tests.
- Existing submission/exam tests do not assert real grading correctness (the random-score worker and mock answer key survive).

---

## ✅ What's genuinely good

- Full breadth: every nav page and API module exists — **no TODO stubs, real API integration, no fake data on the frontend**.
- Clean backend layering (routes/service/repo), Winston logging, audit middleware, security headers + CSP, account lockout, refresh tokens.
- Cohesive maroon-branded design system; excellent empty states; robust **student exam UX** (localStorage persistence, tab-leave detection, auto-submit on expiry, keyboard shortcuts, offline detection).
- Feature-rich teacher question builder (bulk import, reorder, MCQ/theory).
- Frontend type safety mostly solid (only ~12 `any` instances); zero production `console.log`.

---

## Top priorities (in order)

1. **Revoke the Cloudflare origin cert**, purge `students.csv` + `.rdb` from git history, and **rotate all 465 student passwords**.
2. Replace the **random/mock grading** with real answer-key comparison; stop trusting client-supplied scores.
3. Fix the **`MANAGE`-implies-verb authorization** gap and the **`jwt.decode` rate-limit bypass** (use `jwt.verify`).
4. Add **foreign keys, indexes, and `institutionId`** to the schema.
5. Make the API base URL configurable; remove global keystroke/mouse telemetry (or gate it behind explicit exam-proctoring consent).
6. Pick **one** deployment config, add the missing frontend Dockerfile, and add a CI pipeline with secret scanning.
