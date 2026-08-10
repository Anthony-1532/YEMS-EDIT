# YEMS Backend - Missing Components Analysis

**Date**: 2026-05-03
**Stack**: Hono (Bun), PostgreSQL (Drizzle ORM), MinIO
**Architecture**: Modular monolith with feature-based modules

---

## Executive Summary

The backend is a **functional MVP** with solid modular structure but lacks **production-grade reliability, security, and scalability features**. Critical gaps include message queue, email service, rate limiting, transaction management, and comprehensive monitoring.

**Total estimated effort**: 30-40 person-weeks to production readiness

### Top 3 Priority Features (Decision Table)

| Rank | Feature | Why it’s critical | Est. effort |
|------|---------|-------------------|-------------|
| 1 | Security hardening bundle (rate limiting, headers, CORS whitelist, lockout, password policy, request/file limits) | Immediate attack-surface reduction (P0) | ~5–7 days |
| 2 | Transaction management | Prevents data corruption/race conditions (especially exam submissions/grades) | ~2–3 days |
| 3 | Message queue + Redis (BullMQ) | Needed for async jobs and scalability foundation | ~3–4 days |

---

## CRITICAL - Production Blockers

### 1. Message Queue / Background Jobs
**Status**: ❌ Completely missing
**Why needed**:
- Email sending (password resets, grade notifications, admissions, fee reminders)
- PDF generation (report cards, transcripts, certificates)
- Bulk operations (student import, grade exports)
- Scheduled tasks (daily summaries, attendance reminders, payment due notices)
- File processing (video transcoding, document conversion)
- Notifications delivery (email/SMS push)

**Impact**: All long-running operations block HTTP requests → poor UX, timeouts
**Complexity**: HIGH
- Requires Redis/RabbitMQ infrastructure
- Job state management, retry logic, dead letter queues
- Monitoring dashboard needed
- Integration with existing codebase

**Recommended stack**: BullMQ + Redis (Node.js ecosystem maturity)
**Files to create**:
- `src/queue/` (BullMQ setup, job definitions)
- `src/modules/notifications/notification.worker.ts`
- `src/modules/email/email.worker.ts`
- `src/modules/reports/report.worker.ts`
- Docker compose: add `redis` service
- `docker-compose.override.yml` for local dev

---

### 2. Email Service
**Status**: ❌ No email capability (schema has `account_settings.schoolEmail` but no sending logic)
**Why needed**:
- Password reset flows (currently broken - users can't recover passwords)
- Admission approval/rejection notifications
- Grade/report card notifications
- Payment/fee reminders
- System alerts to admins
- Parent communications

**Complexity**: MEDIUM
**Required**:
- SMTP configuration OR SendGrid/Mailgun API integration
- Template system (EJS, Handlebars, or MJML for HTML emails)
- Email queue integration (ties to message queue)
- Delivery tracking & bounce handling
- Spam compliance (DKIM, SPF, DMARC records)
- Email testing in dev (Ethereal or Mailtrap)

**Files to create**:
- `src/modules/email/` (service, routes, templates)
- `src/modules/email/email.schema.ts` (email logs table)
- Update `auth.service.ts` password reset flow
- Update `admissions.service.ts` notification flow

---

### 3. Rate Limiting
**Status**: ❌ None
**Why needed**:
- Prevent brute force login attacks
- API abuse protection
- DDoS mitigation layer
- Fair usage enforcement

**Complexity**: LOW-MEDIUM
**Required**:
- Redis-based distributed rate limiting (shared state across instances)
- Per-endpoint limits (stricter for `/api/auth/login`, `/api/auth/register`)
- Per-user/IP limits
- Burst allowance (token bucket)
- Rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`)

**Files to modify**:
- `src/app/middleware.ts` - add rate limit middleware before auth
- `src/config/rate-limit.ts` - configuration

**Recommendation**: `@hono/rate-limit` with Redis store

---

### 4. Security Hardening

#### A. Security Headers (Helmet equivalent)
**Status**: ❌ Missing
**Risk**: XSS, clickjacking, MIME sniffing attacks
**Complexity**: LOW

**Files to modify**: `src/app/app.ts`
**Add middleware**:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (in production)
- `Content-Security-Policy` (strict for admin panel)
- `Referrer-Policy: strict-origin-when-cross-origin`

**Tool**: Use `hono/helmet` or custom middleware

---

#### B. Request Size Limits
**Status**: ❌ Unlimited body size
**Risk**: DoS via large JSON payloads, memory exhaustion
**Complexity**: LOW

**Add to**: `src/app/app.ts`
```typescript
app.use('*', async (c, next) => {
  const contentLength = Number(c.req.header('content-length') || 0)
  if (contentLength > 10 * 1024 * 1024) { // 10MB limit
    return c.json({ error: 'Payload too large' }, 413)
  }
  await next()
})
```

Also limit:
- File uploads (per file & total request)
- URL length
- Query string depth

---

#### C. File Upload Validation
**Status**: ⚠️ Basic (MinIO upload only, no validation)
**Risk**: Malware upload, XSS via SVG/HTML files, storage exhaustion, MIME confusion attacks
**Complexity**: MEDIUM

**Required in** `src/modules/storage/storage.service.ts`:
- **MIME type validation** (check actual content, not just extension)
- **File size limits** (per file + per user quota)
- **Extension whitelist** (images: jpg, png, gif, webp; docs: pdf, doc, docx)
- **Virus scanning integration** (ClamAV) - HIGH priority for production
- **Content inspection** (reject HTML/SVG with scripts)
- **Path traversal protection** (already using `generateId()` but verify)

**Files to modify**:
- `storage.service.ts` - add validation before upload
- `storage.routes.ts` - add size limits, user quotas
- Consider `src/lib/file-validator.ts` - reusable validation

---

#### D. Password Policies
**Status**: ❌ No validation (any password accepted)
**Risk**: Weak passwords, credential stuffing
**Complexity**: LOW

**Add to**: `src/modules/auth/auth.schema.ts`
```typescript
password: z.string()
  .min(8, 'At least 8 characters')
  .regex(/[A-Z]/, 'One uppercase letter')
  .regex(/[a-z]/, 'One lowercase letter')
  .regex(/[0-9]/, 'One number')
  .regex(/[^A-Za-z0-9]/, 'One special character')
```

**Also check**: `users.service.ts` `createUser()` and `updateUser()` for password changes

---

#### E. Account Lockout
**Status**: ❌ Unlimited login attempts
**Risk**: Brute force attacks
**Complexity**: MEDIUM

**Required**:
- Track failed login attempts per account + IP
- Lock after 5 failed attempts for 15 minutes
- Progressive delays (exponential backoff)
- Admin unlock capability
- Notification on lockout

**Implementation options**:
1. **Redis** (preferred): Store `failed_login:{email}` with TTL, increment on failure
2. **DB table**: `failed_logins` with timestamp, cleanup job

**Files to create**:
- `src/modules/auth/auth.lockout.ts` (service)
- Update `auth.service.ts` login to check lockout
- Update `auth.routes.ts` to increment counter on failure
- Admin endpoint to unlock

---

#### F. MFA/2FA
**Status**: ❌ Not implemented
**Risk**: Single-factor authentication only
**Complexity**: HIGH

**Required**:
- TOTP (Google Authenticator) support
- QR code generation for setup
- Backup codes (10 single-use)
- Recovery flows (email reset with rate limit)
- Admin-required MFA for privileged roles
- Session-based MFA challenge

**Files to create**:
- `src/modules/mfa/mfa.service.ts`
- `src/modules/mfa/mfa.routes.ts`
- `src/modules/mfa/mfa.schema.ts` (store secret, backup codes)
- Update `users.schema.ts` with `mfaEnabled`, `mfaSecret` fields

---

#### G. Token Revocation Strategy
**Status**: ⚠️ Refresh tokens stored but **no access token blacklist**
**Risk**: Compromised access tokens valid until expiry (15m), can't force logout
**Complexity**: MEDIUM

**Current**: Refresh tokens table only tracks revocation of refresh tokens, not access tokens
**Problem**: Access tokens are stateless JWTs - no way to invalidate before expiry

**Solution**:
1. **Short-lived access tokens** (already 15min - good)
2. **Redis blacklist**: Store revoked access token jti (JWT ID) until expiry
3. **Middleware check**: Verify token not in blacklist before each request
4. **Logout handler**: Add token jti to blacklist

**Files to modify**:
- `src/config/redis.ts` (new Redis client)
- `src/modules/auth/auth.service.ts` logout → add to blacklist
- `src/app/middleware.ts` authMiddleware → check blacklist
- Add `jti` claim to JWT on generation

---

#### H. CORS Configuration
**Status**: ⚠️ Default `CORS_ORIGIN=*` (wildcard) in production
**Risk**: Any origin can access API → CSRF, data exfiltration
**Complexity**: LOW

**Fix** (`.env.example` & `docker-compose.yml`):
```env
CORS_ORIGIN=https://yems.edu,https://admin.yems.edu
```

**In** `src/app/app.ts` line 22: Already validates against list, just change default

---

### 5. Caching Layer
**Status**: ❌ No Redis/Memcached
**Why needed**:
- Session storage (if moving from JWT later)
- Rate limit counters (currently impossible without Redis)
- Frequently accessed data (school settings, subjects, user profiles)
- API response caching (reduce DB load)
- Lock distribution (for critical sections)

**Complexity**: MEDIUM-HIGH
**Required**:
- Redis setup & configuration
- Cache key strategy
- TTL policies
- Cache invalidation patterns
- Distributed cache consistency

**Files to create**:
- `src/cache/` (Redis client, cache service)
- `src/decorators/cache.ts` (optional, for method caching)
- Update services to use cache-aside pattern

**Priority**: HIGH (blocks rate limiting, session management)

---

## HIGH PRIORITY - Reliability & Data Integrity

### 6. Transaction Management
**Status**: ❌ NO transactions found in entire codebase
**Critical Race Conditions**:

#### A. Exam Submissions (CRITICAL)
**File**: `src/modules/submissions/submissions.routes.ts:43-52`
**Bug**: Student can submit multiple times to same exam
```typescript
app.post('/', async () => {
  // Race: Student clicks rapidly → 2 submissions created
  await submissionsService.createSubmission({ examId, studentId, answers })
})
```
**No database constraint** on `(exam_id, student_id)` uniqueness
**Impact**: Multiple submissions → grading confusion, data integrity issues

**Fix**: 
1. Add unique constraint: `examsId` + `studentId` in `submissions` table
2. Use `INSERT ... ON CONFLICT DO NOTHING` or transaction with select-for-update
3. Transaction: Check if exists →Insert (atomic)

**Complexity**: MEDIUM (migration + service refactor)

---

#### B. Grade Updates
**Scenario**: Two teachers grade same submission simultaneously
**Current**: Last write wins → one grade lost
**Fix**: Optimistic locking with `version` column or transactions with `SELECT FOR UPDATE`

**Files**: `submissions.service.ts` `gradeSubmission()`

---

#### C. Payment Processing (Future)
Bills/payments tables exist (`src/db/schema/accountant.ts`) but **NO service/API**
When implemented, need ACID transactions:
- Update bill status to "paid"
- Create payment record
- Update account balance (if tracked)
- All must succeed or rollback together

---

**Overall Transaction Strategy**:
- **Drizzle supports**: `db.transaction()` (see Drizzle docs)
- Identify all multi-step operations: 
  1. Exam submission (check + insert)
  2. Grade update (update submission + update results table)
  3. User creation + welcome email (not transactional, but email should be async)
  4. Admission approval (update status + notify)
  5. Payment processing (future)
- Wrap in `db.transaction()` with proper error handling

**Files to modify**: All service files with multi-step logic
**Complexity**: MEDIUM (2-3 days for audit + refactor)

---

### 7. Audit Logging
**Status**: ⚠️ `audit-logs` table exists but **NOT used anywhere**
**Impact**: No audit trail for compliance (GDPR, FERPA), impossible to trace security incidents, debugging nightmare
**Complexity**: LOW-MEDIUM

**Required**:
- Log all CRUD operations (Who? What? When? Where?)
- Log authentication events (login, logout, failed attempts)
- Log permission changes (role updates)
- Log sensitive data access (student records, grades)
- Include: `actorId`, `action`, `entityType`, `entityId`, `details`, `ipAddress`, `userAgent`

**Implementation options**:
1. **Middleware approach**: Intercept all requests, log based on route
2. **Service approach**: Add `auditService.log()` calls in each service method
3. **Hybrid**: Middleware for auth events + service calls for business logic

**Files to create**:
- `src/modules/audit/audit.service.ts`
- `src/modules/audit/audit.repo.ts`
- `src/middleware/audit.middleware.ts`
- Update all services to call audit log on writes

**Query API needed**: Admin-only `/api/admin/audit/logs` endpoint

---

### 8. Database Backup Strategy
**Status**: ❌ None
**Risk**: Data loss from DB corruption, accidental deletion, hardware failure
**Complexity**: MEDIUM

**Required**:
- Automated daily backups (pg_dump or WAL continuous archiving)
- Backup storage (separate from primary - S3/MinIO different bucket)
- Backup rotation/retention (keep 30 daily, 12 monthly)
- Backup restoration testing **monthly** (critical!)
- Point-in-time recovery (PITR) setup for PostgreSQL WAL
- Backup encryption at rest

**Implementation**:
```bash
# Daily backup cron (inside postgres container or external)
0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/yems-$(date +%Y%m%d).sql.gz
```

- Upload to MinIO `yems-backups` bucket
- Verify backup integrity (checksum)
- Monitor backup failures

**Files to create**:
- `docker-compose.backup.yml` (backup service)
- `scripts/backup.sh`, `scripts/restore.sh`
- Documentation: `docs/backup-restore.md`

---

### 9. Monitoring & Alerting
**Status**: ⚠️ Basic Winston file logging, no APM
**Gaps**:
- ❌ No error tracking (Sentry/LogRocket)
- ❌ No performance monitoring (response times, slow DB queries)
- ❌ No infrastructure metrics (CPU, memory, disk, DB connections)
- ❌ No alerting (PagerDuty, Slack, email)
- ❌ No uptime monitoring (UptimeRobot, Pingdom)
- ❌ No log aggregation (ELK, Loki, Datadog)

**Complexity**: MEDIUM-HIGH

**Tiered approach**:

**Tier 1 - Immediate (Free/cheap)**:
- Structured logging with request IDs (correlation IDs)
- Log rotation & retention policy
- Health check endpoint already exists but needs `/health/db` and `/health/storage` in k8s probes
- Dashboard: `PORT=4000` → expose metrics endpoint (Prometheus format)

**Tier 2 - Production (Cost involved)**:
- **Error Tracking**: Sentry (self-hosted or SaaS) - capture exceptions with stack traces
- **APM**: New Relic / DataDog / AppSignal - response time, trace database queries
- **Infrastructure**: Prometheus + Grafana (self-hosted) - scrape metrics
- **Alerting**: Alertmanager → Slack/Email/PagerDuty on error spikes, latency, downtime

**Files to modify**:
- `src/config/logger.ts` - add request ID middleware
- `src/app/middleware.ts` - add correlation ID generation
- `src/metrics/` - Prometheus metrics collector
- Docker compose: add `prometheus`, `grafana` services

---

## MEDIUM PRIORITY - Missing Business Features

### 10. Real-time Notifications
**Status**: ❌ Notifications stored in DB only, no push
**Schema**: `src/db/schema/notifications.ts` (good structure)
**Missing**:
- WebSocket server for live updates
- Push notifications (browser API, mobile FCM/APNS)
- Email notifications (needs email service)
- SMS notifications (Twilio, AWS SNS)
- Notification preferences (user opt-in/out)
- Read status sync across devices

**Complexity**: HIGH
**Required**:
- WebSocket server setup (Hono + `@hono/websocket` or Socket.io)
- Connection management (per user, rooms by class/group)
- Notification broadcasting
- Offline queue (store unsent notifications)
- Push notification service integration
- Client-side integration (frontend)

**Files to create**:
- `src/websocket/` (WebSocket server, connection manager)
- `src/modules/notifications/notification.worker.ts` (queue worker to send emails/SMS)
- Frontend: real-time listener in `packages/frontend/js/`

---

### 11. Billing & Payments Module
**Status**: ❌ **CRITICAL MISSING** - Schema exists (`bills`, `payments`, `account_settings`) but **NO APIs**
**Impact**: School cannot manage fees or track payments → no revenue operations
**Complexity**: HIGH

**Database**: `src/db/schema/accountant.ts`
**Required APIs**:
- CRUD for bills (create, read, update, delete)
- Student/parent view of their bills
- Mark bill as paid (with payment record)
- Payment gateway integration (Stripe international, Paystack/Flutterwave Africa)
- Invoice PDF generation (needs message queue + PDF lib)
- Receipt email (needs email service)
- Payment reconciliation
- Outstanding balances dashboard
- Financial reports (income statement, balance sheet)

**Payment Flow**:
1. Admin creates bill → student/parent notified (email + in-app)
2. Student/parent views bill → clicks "Pay Now"
3. Backend creates payment intent (Stripe/Paystack)
4. Gateway returns payment URL (hosted page)
5. Student completes payment (redirect to success callback)
6. Gateway webhook → backend verifies → marks bill paid, creates payment record, sends receipt
7. Bill status updated, notifications sent

**Files to create**:
- `src/modules/billing/billing.service.ts`
- `src/modules/billing/billing.routes.ts`
- `src/modules/billing/billing.schema.ts` (validation)
- `src/modules/payments/payments.service.ts`
- `src/modules/payments/payments.routes.ts`
- `src/integrations/stripe/` or `paystack/` (payment gateway client)
- `src/workers/payment-webhook.worker.ts` (handle gateway callbacks)

**Dependencies**: `stripe` or `paystack` npm package

---

### 12. Attendance Tracking
**Status**: ❌ Not in database schema
**Need**: Student/teacher daily attendance, class attendance
**Complexity**: MEDIUM

**New tables**:
- `attendance` (id, studentId, class, date, status [present/absent/late], markedBy, markedAt, notes)
- `attendance_sessions` (for daily batch marking)

**APIs**:
- Mark attendance (teacher)
- View attendance (student, parent, admin)
- Attendance reports (by class, student, term)
- Daily attendance summary

**Files**: `src/modules/attendance/` (new module)

---

### 13. Timetable/Scheduling
**Status**: ⚠️ `lessons` table exists but limited
**Missing**:
- Class schedules (day, time, room, subject, teacher)
- Teacher availability
- Room allocation
- Conflict detection (double-booking)
- Calendar integration (iCal/Google Calendar)
- Recurring schedule patterns

**Complexity**: MEDIUM-HIGH
**Required**:
- Enhanced `lessons` schema or new `schedule` table
- Conflict detection algorithm
- Schedule export
- Substitute teacher handling

**Files**: Expand `src/modules/lessons/` or create `src/modules/schedule/`

---

### 14. Report Generation
**Status**: `reports` module is **bug reports only**, missing academic/financial reports
**Missing**:
- Academic reports (transcripts, report cards, term summaries)
- Financial reports (fee collection, outstanding balances)
- Attendance reports
- Performance analytics
- Export to PDF, Excel, CSV
- Scheduled report generation (email to admins weekly/monthly)

**Complexity**: HIGH
**Needs**: Message queue + PDF generation (Puppeteer, pdfkit, or headless Chrome)

**Files**: Expand `src/modules/reports/` or create `src/modules/academic-reports/`

---

### 15. Parent Features
**Status**: `parent` role exists but limited permissions (`CHILDREN_READ`, `CHILDREN_GRADES_READ`)
**Missing**:
- View children's grades (results)
- View children's attendance
- Pay fees (link to billing module)
- Communicate with teachers (messaging?)
- View children's schedule/timetable
- Receive notifications about children

**Complexity**: MEDIUM
**Required**:
- Parent-specific endpoints (`/api/parent/children/:id/grades`)
- Child relationship table (ensure parent can only access own children)
- Data filtering (parent's children only)

---

### 16. Search Functionality
**Status**: Basic `LIKE` queries only (`users`, `subjects`, etc.)
**Issues**:
- No full-text search (PostgreSQL `tsvector` or Elasticsearch)
- No filtering combinations (e.g., exams by type + subject + date range)
- No sorting beyond `createdAt`
- No pagination metadata (total count)
- No search across multiple resource types

**Complexity**: MEDIUM
**Short term**: Improve queries with PostgreSQL full-text search (GIN indexes)
**Long term**: Elasticsearch/Meilisearch for advanced search

**Files to modify**: All repo files with search methods

---

### 17. Bulk Operations
**Status**: All operations single-record
**Missing**:
- Bulk user import (CSV/Excel)
- Bulk grade upload (Excel)
- Bulk score updates
- Bulk notifications send
- Bulk assignment creation

**Complexity**: HIGH
**Needs**: Message queue for async processing, progress tracking, error reporting

**Files**: New `src/modules/bulk/` module

---

### 18. Data Export/Import
**Status**: ❌ None
**Missing**:
- Student data export (CSV/Excel)
- Grade export (PDF/Excel)
- Database backup/restore via API (admin)
- Data migration tools (school year rollover)
- Report card PDF generation

**Complexity**: MEDIUM
**Tools**: `xlsx` (Excel), `pdfkit` (PDF), `csv-writer`

---

## MEDIUM-LOW PRIORITY - Developer Experience

### 19. CI/CD Pipeline
**Status**: ❌ No GitHub Actions/GitLab CI
**Impact**: Manual testing, no automated deployment, inconsistent builds
**Complexity**: MEDIUM

**Required**:
- `.github/workflows/ci.yml` (run tests on PR)
- `.github/workflows/lint.yml` (ESLint, Prettier)
- `.github/workflows/build.yml` (Docker image build)
- `.github/workflows/deploy.yml` (auto-deploy to staging on merge)

**Jobs**:
1. Install dependencies
2. Run `bun run lint`
3. Run `bun run test` (with coverage)
4. Build Docker image
5. Push to registry (GitHub Container Registry)
6. Deploy to server (SSH or Kubernetes)

---

### 20. API Documentation
**Status**: ⚠️ Swagger UI at `/docs` exists but may be incomplete
**Check**: Verify all endpoints have proper OpenAPI decorators
**Complexity**: LOW

**Files**: Each `*.routes.ts` should have `@tags`, `@summary`, `@description`, `@param`, `@request`, `@response` decorators from `@hono/zod-openapi`

---

### 21. Graceful Shutdown
**Status**: ❌ `main.ts` doesn't handle SIGTERM/SIGINT
**Risk**: In-flight requests dropped when container stops, data loss
**Complexity**: LOW

**Fix** `src/main.ts`:
```typescript
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully')
  await server.close() // if using hono/node-server
  process.exit(0)
})
```

Also:
- Stop accepting new requests
- Finish in-flight requests (with timeout)
- Close DB connections
- Close Redis connections

---

### 22. Environment-specific Configs
**Status**: Single `.env` pattern for all environments
**Missing**:
- Separate configs for `development`, `staging`, `production`
- Feature flags (enable/disable features per environment)
- A/B testing support
- Instance-specific overrides

**Complexity**: LOW-MEDIUM

**Approach**: Use `dotenv-flow` or config files:
```
config/
  development.ts
  staging.ts
  production.ts
  index.ts (selects based on NODE_ENV)
```

---

## DEPENDENCY VULNERABILITIES

**npm audit findings** (dev dependencies only - good news):

| Package | Severity | Issue | Fix |
|---------|----------|-------|-----|
| chokidar | HIGH | Uncontrolled resource consumption | Update to `^3.6.0` |
| braces | HIGH | Resource consumption DoS | Already fixed in latest |
| anymatch | MODERATE | Regex DoS | Update to `^2.0.0` |
| micromatch | MODERATE | ReDoS | Update to `^4.0.8` |
| http-auth | MODERATE | Weak randomness (via uuid?) | Update `uuid` to latest |

**Action**: Run `npm update` in `packages/backend`, verify versions

---

## ARCHITECTURAL CONCERNS

### No Domain Events
**Problem**: Modules don't communicate. Changes in one module don't trigger reactions in others.
**Example**: Grade saved → should:
1. Update student GPA
2. Notify student/parent
3. Generate report card (async)
4. Update class average

**Current**: No mechanism - requires synchronous service calls → tight coupling

**Solution**: Event-driven architecture via message queue
- Domain events: `GradePublished`, `ExamSubmitted`, `PaymentReceived`
- Event listeners in separate workers
- Loose coupling, extensibility

---

### Tight Coupling
**Problem**: Services call repositories directly; no abstraction layer
**Impact**: Hard to test, swap implementations, add cross-cutting concerns (caching, logging)
**Solution**: Domain services with clear interfaces, dependency injection

---

### No Query Optimization
**Problem**: 
- Potential N+1 queries (e.g., get exam with questions and nested options?)
- No indexes defined in schema (PostgreSQL defaults only)
- No `EXPLAIN ANALYZE` on slow queries

**Required**:
- Review all `findBy` queries - add composite indexes
- Profile slow queries in production
- Consider connection pool size (currently 20, might need tuning)

---

## CURRENT CODEBASE ASSESSMENT

### Strengths
✅ Modular structure (feature-based modules)
✅ RBAC permission system (comprehensive)
✅ Drizzle ORM (type-safe queries)
✅ Zod validation (input validation present)
✅ Error handling with custom error classes
✅ JWT auth with refresh tokens
✅ Swagger UI API docs
✅ Docker multi-service setup
✅ Health check endpoints
✅ Comprehensive test setup (Vitest) - but low coverage

### Weaknesses
❌ No async processing (all synchronous)
❌ No rate limiting
❌ No audit logging (table exists but unused)
❌ No transactions (data integrity risk)
❌ No email service (critical user flows broken)
❌ No billing module (revenue-critical)
❌ No monitoring/error tracking
❌ No caching (DB may overload)
❌ Weak security posture (multiple gaps)
❌ No CI/CD
❌ Low test coverage (need to check `vitest.config.ts` thresholds enforced?)

---

## IMPLEMENTATION ROADMAP

### Phase 1 - Security & Hardening (Week 1-2) ⚠️ URGENT
**Goal**: Address critical security vulnerabilities

1. ⭐ Rate limiting (1 day)
2. ⭐ Security headers (2 hours)
3. ⭐ Request size limits (2 hours)
4. ⭐ File upload validation (1 day)
5. ⭐ Password strength validation (2 hours)
6. ⭐ Account lockout (1 day)
7. ⭐ CORS whitelist enforcement (1 hour)
8. Update dev dependencies (vulnerabilities) (2 hours)
9. Basic request logging with IP & user agent

**Total**: ~5-7 days

---

### Phase 2 - Core Infrastructure (Week 3-5) 🔥 HIGH PRIORITY
**Goal**: Foundation for scalability & reliability

10. **Message Queue + Redis** (3 days)
    - Setup Redis container
    - Install BullMQ
    - Create job types (email, pdf, reports, notifications)
    - Dashboard (optional)

11. **Email Service** (2 days)
    - SMTP or SendGrid integration
    - Template system (2-3 templates initially)
    - Queue worker for sending
    - Email logs table

12. **Transaction Management** (2 days)
    - Audit all multi-step operations
    - Implement transactions for:
      - Exam submission
      - Grade update
      - User creation + welcome email (outbox pattern)
    - Add deadlock retry logic

13. **Audit Logging** (1 day)
    - Audit service + middleware
    - Log all writes
    - Admin endpoint to view audit trail

14. **Database Backup Automation** (1 day)
    - Daily pg_dump cron
    - Upload to MinIO `backups` bucket
    - Retention policy (30 days)
    - Test restore procedure

15. **Graceful Shutdown** (2 hours)

**Total**: ~9-10 days

---

### Phase 3 - Critical Business Features (Week 6-10) 💰 HIGH VALUE
**Goal**: Enable school operations & revenue

16. **Billing & Payments Module** (5 days) - **REVENUE CRITICAL**
    - Bills CRUD APIs
    - Payment gateway (Stripe/Paystack)
    - Webhook handler
    - Receipt emails
    - Parent billing view
    - Admin financial dashboard

17. **Real-time Notifications** (4 days)
    - WebSocket server
    - In-app notifications (already has table)
    - Email notifications via queue
    - Frontend integration

18. **Search Improvements** (2 days)
    - PostgreSQL full-text search for users, exams, notes
    - Combined filters
    - Sort by multiple fields
    - Pagination metadata

19. **Attendance Tracking** (3 days) - NEW MODULE
    - Attendance schema
    - Mark attendance (teacher)
    - View attendance (student, parent, admin)
    - Reports

20. **Timetable/Scheduling** (3 days) - ENHANCE lessons module
    - Class schedule CRUD
    - Conflict detection
    - Teacher schedule view

**Total**: ~17 days

---

### Phase 4 - Reliability & Observability (Week 11-12) 📊
**Goal**: Production monitoring & alerting

21. **Error Tracking** (1 day)
    - Sentry integration
    - Capture all unhandled errors
    - Breadcrumbs for request flow

22. **APM & Metrics** (2 days)
    - Prometheus metrics endpoint
    - Response time histograms
    - DB connection pool metrics
    - Queue depth metrics

23. **Logging Improvements** (1 day)
    - Structured JSON logs with correlation IDs
    - Request ID middleware
    - Centralized log format

24. **Alerting Setup** (1 day)
    - Alert rules (5xx rate > 1%, latency > 2s, DB down)
    - Slack/Email notifications
    - On-call rotation (if needed)

25. **Health Check Enhancements** (2 hours)
    - Add liveness/readiness probes for k8s
    - Dependencies check (DB, Redis, MinIO)

**Total**: ~5-6 days

---

### Phase 5 - Developer Experience (Week 13) 🛠️
**Goal**: Automate & streamline

26. **CI/CD Pipeline** (2 days)
    - GitHub Actions for tests, lint, build
    - Automated Docker image builds
    - Auto-deploy to staging on merge
    - Manual approval for production

27. **API Documentation Polish** (1 day)
    - Complete OpenAPI annotations
    - Add request/response examples
    - Auto-generated client SDKs (optional)

28. **Feature Flags** (1 day)
    - Config-based flags
    - Gradual rollout support

29. **Environment Configs** (2 hours)
    - Separate config per NODE_ENV
    - Sensible defaults

**Total**: ~4 days

---

## QUICK WINS (Do First - <1 week)

These have **high impact, low effort**:

1. ✅ Fix CORS: Change default from `*` to whitelist (5 min)
2. ✅ Add request size limits (30 min)
3. ✅ Implement password validation (1 hour)
4. ✅ Add account lockout (4 hours)
5. ✅ Update vulnerable dev dependencies (15 min)
6. ✅ Enable rate limiting (2 hours with `@hono/rate-limit`)
7. ✅ Add security headers middleware (30 min)
8. ✅ Implement graceful shutdown (1 hour)
9. ✅ Use audit logs table (2 hours - add middleware)
10. ✅ Add basic file validation (2 hours)

**Impact**: Mitigate immediate security risks, improve stability

---

## RISK PRIORITY MATRIX

| Risk | Likelihood | Impact | Priority | Action |
|------|------------|--------|----------|--------|
| Data corruption (no transactions) | HIGH | CRITICAL | 🔥 P0 | Implement transactions immediately |
| Brute force attacks | HIGH | HIGH | 🔥 P0 | Rate limit + account lockout |
| XSS/CSRF | MEDIUM | HIGH | 🔥 P0 | Security headers + CORS fix |
| Password spray | HIGH | HIGH | P1 | Password policy + account lockout |
| Data loss (no backup) | MEDIUM | CRITICAL | P1 | Backup automation |
| Compromised tokens | MEDIUM | HIGH | P1 | Token blacklist + short expiry (already 15m) |
| No email flows broken | HIGH | HIGH | P1 | Email service |
| Payment features missing | MEDIUM | CRITICAL | P2 | Billing module (revenue) |
| No monitoring | HIGH | MEDIUM | P2 | Sentry + basic metrics |
| Race conditions in exams | MEDIUM | HIGH | P2 | DB constraints + transactions |
| File upload malware | MEDIUM | HIGH | P2 | File validation + virus scan |

**P0 = This week, P1 = Next 2 weeks, P2 = This month**

---

## TECHNICAL DEBT SUMMARY

| Category | Item | Effort | Priority |
|----------|------|--------|----------|
| Security | Rate limiting | 1d | P0 |
| Security | Security headers | 2h | P0 |
| Security | Request size limits | 2h | P0 |
| Security | File validation | 1d | P0 |
| Security | Password policy | 1h | P0 |
| Security | Account lockout | 1d | P0 |
| Security | CORS whitelist | 15m | P0 |
| Security | Token blacklist | 2d | P1 |
| Infrastructure | Message queue (Redis+BullMQ) | 3-4d | P1 |
| Infrastructure | Email service | 2-3d | P1 |
| Infrastructure | Caching layer | 2-3d | P2 |
| Reliability | Transactions | 2-3d | P1 |
| Reliability | Audit logging | 1d | P1 |
| Reliability | DB backups | 1d | P1 |
| Reliability | Graceful shutdown | 1h | P1 |
| Observability | Error tracking (Sentry) | 1d | P2 |
| Observability | Metrics (Prometheus) | 2d | P2 |
| Observability | Alerting | 1d | P2 |
| Features | Billing module | 4-5d | P1 |
| Features | Real-time notifications | 3-4d | P2 |
| Features | Attendance | 2d | P2 |
| Features | Timetable/schedule | 2-3d | P2 |
| Features | Search improvements | 2d | P2 |
| Features | Bulk operations | 3d | P3 |
| Features | Data export/import | 2d | P3 |
| DX | CI/CD pipeline | 2d | P2 |
| DX | API docs polish | 1d | P3 |
| DX | Feature flags | 1d | P3 |

---

## FILE REFERENCES

### Key Configuration Files
- `package.json` - dependencies, scripts
- `docker-compose.yml` - services (postgres, minio, backend, frontend, caddy)
- `Caddyfile` - reverse proxy rules
- `.env.example` - environment variables (UPDATE: CORS_ORIGIN, add Redis URL)
- `vitest.config.ts` - test configuration
- `tsconfig.json` - TypeScript config

### Core Application
- `src/main.ts` - entry point (needs graceful shutdown)
- `src/app/app.ts` - Hono app setup (CORS, middleware)
- `src/app/middleware.ts` - auth, permission checks
- `src/app/routes.ts` - route registration

### Configuration
- `src/config/db.ts` - PostgreSQL connection pool (size 20 - monitor)
- `src/config/logger.ts` - Winston logging (structured JSON)
- `src/config/storage.ts` - MinIO client
- `src/config/env.ts` - env validation (Zod)

### Database Layer
- `src/db/schema/` - Drizzle schemas (19 tables)
- All schemas lack indexes (add composite indexes for queries)

### Modules (Feature-based)
```
src/modules/
├── auth/         (JWT auth, refresh tokens)
├── users/        (CRUD, RBAC)
├── admin/        (admin panel APIs)
├── exams/        (quiz, midterm, final)
├── assignments/  (homework)
├── notes/        (study materials)
├── submissions/  (exam submissions, grading)
├── results/      (grade book)
├── notifications/ (in-app notifications)
├── lessons/      (live lessons)
├── schemes/      (schemes of work)
├── lesson-plans/ (teacher plans)
├── midterm-results/
├── reports/      (bug reports only)
├── admissions/   (student enrollment)
├── storage/      (file upload to MinIO)
├── student/      (student-specific endpoints)
├── teacher/      (teacher-specific endpoints)
├── technician/   (system monitoring)
└── (missing: billing, attendance, mfa, email, audit, bulk)
```

### Missing Modules (Priority Order)
1. `src/modules/billing/` - payments, bills (💰 CRITICAL)
2. `src/queue/` - BullMQ setup
3. `src/modules/email/` - email service
4. `src/modules/attendance/` - attendance tracking
5. `src/modules/mfa/` - 2FA
6. `src/modules/audit/` - audit logging
7. `src/modules/payments/` - payment gateway integration
8. `src/websocket/` - real-time
9. `src/modules/bulk/` - bulk operations
10. `src/modules/schedule/` - timetable

---

## QUESTIONS FOR STAKEHOLDERS

Before implementation, clarify:

1. **Email Provider**: SMTP (Gmail/Office365) or API (SendGrid/Mailgun)? Budget?
2. **Payment Gateway**: Stripe (international) or Paystack/Flutterwave (Africa)? Business account?
3. **Message Queue**: Redis + BullMQ (Node-native) or RabbitMQ? Existing Redis instance?
4. **Monitoring Budget**: Willing to pay for Sentry/DataDog or self-host?
5. **Search Scale**: Expect >10k records? Consider Elasticsearch now or later?
6. **Compliance**: GDPR/FERPA requirements? Data retention policies?
7. **Backup RPO/RTO**: Acceptable data loss (RPO) and recovery time (RTO)?
8. **Multi-tenancy**: Single school or multi-tenant SaaS? (Affects data isolation)
9. **Mobile Apps**: Native apps planned? (Push notification requirements)
10. **Offline Mode**: Need offline sync? (PWA, conflict resolution)

---

## NEXT STEPS (Action Items)

### This Week (P0)
- [ ] Review this document with team
- [ ] Prioritize Phase 1 items with product owner
- [ ] Set up Redis instance (local + Docker)
- [ ] Create `next.md` (this file) in project root
- [ ] Assign Phase 1 tasks to engineers
- [ ] Create GitHub Issues for each task
- [ ] Set up Sentry project (free tier)

### Next Week (P1)
- [ ] Complete Phase 1 (Security hardening)
- [ ] Begin Phase 2 (Message queue + email)
- [ ] Add Redis to `docker-compose.yml`
- [ ] Install BullMQ, create first job (email)
- [ ] Design billing module data model (review with stakeholders)
- [ ] Choose payment gateway, create account

### Month 1
- [ ] Complete Phases 1-2 (security + infrastructure)
- [ ] Begin Phase 3 (billing + notifications)
- [ ] Setup CI/CD pipeline
- [ ] Database backup automation live
- [ ] Deploy to staging with monitoring

### Month 2-3
- [ ] Complete Phase 3 (all critical business features)
- [ ] Deploy to production
- [ ] Implement Phase 4 (observability)
- [ ] Phase 5 (DX improvements)

---

## CONCLUSION

Your backend is a **well-structured MVP** that needs **production-grade hardening**. Biggest risks:

1. **Data integrity** (no transactions)
2. **Security** (multiple critical gaps)
3. **No async processing** (all sync → poor scalability)
4. **Missing billing** (no revenue flow)
5. **Zero observability** (blind in production)

**Start with Phase 1 (security)** immediately, then **Phase 2 (message queue)** - everything else depends on that foundation.

**Total time to production-ready**: ~3 months with 1-2 engineers.

---

**Document Version**: 1.0
**Last Updated**: 2026-05-03
**Owner**: Engineering Team
