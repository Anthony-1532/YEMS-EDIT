# Yeshua Educational Management System (YEMS)

A full-stack educational management platform for schools with role-based portals for students, teachers, admins, accountants, technicians, and parents.

## Tech Stack

### Backend
- **Runtime**: Bun
- **Framework**: Hono (REST API)
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: JWT + Refresh Tokens with account lockout
- **Storage**: MinIO (S3-compatible)
- **Queue**: BullMQ + Redis (email notifications, submissions processing)
- **Email**: Nodemailer
- **Logging**: Winston
- **Docs**: Swagger UI (OpenAPI)
- **Testing**: Vitest
- **Linting**: ESLint + Prettier

### Frontend
- **Framework**: Next.js 16 (React 19)
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Utilities**: clsx, tailwind-merge

## Project Structure

```
YEMS/
├── packages/
│   ├── backend/              # Hono REST API
│   │   └── src/
│   │       ├── app/          # Express-like app setup, middleware, routes
│   │       ├── config/       # DB, env, logger, storage config
│   │       ├── db/schema/    # Drizzle schemas (20 files, ~24 tables)
│   │       ├── modules/      # 23 route modules
│   │       ├── queue/        # Redis connection
│   │       ├── scripts/      # Migration, seed, admin tools
│   │       └── shared/       # Constants, errors, types, utils, validators
│   ├── frontend/             # Next.js SPA
│   │   └── src/
│   │       ├── app/          # Route-based pages (6 portals)
│   │       ├── components/   # UI components + layout
│   │       └── lib/          # API client, auth, utilities
│   └── deprecated-frontend/  # Legacy vanilla JS frontend
├── docker-compose.yml        # Backend + Redis
├── Caddyfile                 # Reverse proxy config
└── .env.example              # Environment template
```

## Portals

| Portal | Description |
|--------|-------------|
| **Admin** | User management, students, teachers, subjects, classes, admissions, results, audit logs, notifications |
| **Teacher** | Exams, assignments, notes, schemes of work, results, class management |
| **Student** | Exams, assignments, notes, results |
| **Accountant** | Fee payments, billing, financial reports |
| **Technician** | System analytics, services & queues, active sessions, alerts, logs |
| **Parent** | Results, school fees |

## Getting Started

### Prerequisites
- Bun
- Docker & Docker Compose
- PostgreSQL 16+
- Redis
- MinIO (optional, for file storage)

### Quick Start (Docker)

```bash
docker compose up -d
```

Services:
- **backend** - API server (port 8080)
- **frontend** - Next.js app (port 5173)
- **redis** - Queue broker (port 6379)

### Local Development

```bash
# Backend
cd packages/backend
bun install
cp .env.example .env
# Edit .env with your DB credentials
bun run dev

# Frontend (separate terminal)
cd packages/frontend
bun install
bun run dev
```

Frontend proxies `/api/*` requests to the backend at `http://localhost:4000` (configurable in `next.config.ts`).

## Database

### Tables (~24)

**Core**
- `users` - All system users with roles
- `refresh_tokens` - JWT refresh tokens
- `classes` - School classes/streams
- `subjects` - Junior/Senior subjects by department

**Academic**
- `exams` - Quizzes, midterms, finals (MCQ support)
- `assignments` - Homework/assignments
- `notes` - Study materials
- `lessons` - Live lesson schedule
- `schemes` - Schemes of work
- `lesson_plans` - Teacher lesson plans
- `results` - Student exam results
- `midterm_results` - Term results
- `submissions` - Student exam submissions

**Finance**
- `bills` - Student fee bills
- `payments` - Payment records
- `account_settings` - Accounting configuration

**Operations**
- `admissions` - New student admissions
- `notifications` - System notifications
- `reports` - Bug reports/feedback
- `audit_logs` - System audit trail

**Platform**
- `institutions` - Multi-tenant support
- `platform_settings` - Global platform config
- `backups` - System backups
- `rbac_roles` - Role-based access control

### Migrations

```bash
cd packages/backend
bun run db:generate  # Create migration
bun run db:migrate   # Apply
bun run db:push      # Push schema directly
bun run db:seed      # Seed demo data (requires students.csv)
```

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Student | naruto@yems.local | naruto123 |
| Student | student@yems.local | student |
| Teacher | teacher@yems.local | teacher |
| Admin | admin@yems.local | admin |
| Superadmin | superadmin@yems.local | superadmin |
| Accountant | account@yems.local | account |
| Principal | principal@yems.local | principal |
| HOD | hod@yems.local | hod |
| Technician | technician@yems.local | technician |
| Parent | parent@yems.local | parent |

## API Endpoints

### Auth
- `POST /api/auth/login` - Login (rate limited)
- `POST /api/auth/register` - Register
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Current user
- `PATCH /api/auth/profile` - Update profile
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/profile-picture` - Upload avatar

### Role-Based
- `/api/admin/*` - Admin management
- `/api/superadmin/*` - Superadmin operations
- `/api/teacher/*` - Teacher operations
- `/api/student/*` - Student operations
- `/api/accountant/*` - Accounting/billing
- `/api/technician/*` - System monitoring

### Resources
- `/api/users/*` - User CRUD
- `/api/notes/*` - Notes management
- `/api/assignments/*` - Assignments
- `/api/exams/*` - Exams & question banks
- `/api/results/*` - Results management
- `/api/submissions/*` - Exam submissions
- `/api/lessons/*` - Lesson schedule
- `/api/schemes/*` - Schemes of work
- `/api/lesson-plans/*` - Lesson plans
- `/api/midterm-results/*` - Term results
- `/api/notifications/*` - Notifications
- `/api/reports/*` - Bug reports/feedback
- `/api/admissions/*` - Admissions
- `/api/storage/*` - File uploads (MinIO)

### Health & Monitoring
- `GET /health` - Basic health check
- `GET /health/db` - Database connectivity
- `GET /health/storage` - Storage connectivity
- `GET /health/queue` - Queue connectivity
- `GET /metrics` - Basic metrics
- `GET /status/metrics` - Status overview
- `GET /docs` - Swagger UI

## Environment Variables

```env
# App
APP_ENV=development
FRONTEND_PORT=5173
BACKEND_PORT=4000
PUBLIC_API_BASE_URL=http://localhost/api

# Database
POSTGRES_USER=yems
POSTGRES_PASSWORD=change-me-postgres-password
POSTGRES_DB=yems
POSTGRES_PORT=5432
DATABASE_URL=postgresql://yems:change-me-postgres-password@localhost:5432/yems

# Auth
JWT_SECRET=replace-with-a-long-random-secret-at-least-32-characters
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Storage (MinIO)
MINIO_ROOT_USER=yems-minio
MINIO_ROOT_PASSWORD=change-me-minio-password
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=yems-minio
MINIO_SECRET_KEY=change-me-minio-password
MINIO_BUCKET=yems-files

# CORS
CORS_ORIGIN=http://localhost,http://127.0.0.1

# Redis
REDIS_URL=redis://localhost:6979
QUEUE_PREFIX=yems

# Rate Limiting
RATE_LIMIT_WINDOW_SECONDS=60
RATE_LIMIT_MAX_REQUESTS=120
RATE_LIMIT_AUTH_MAX_REQUESTS=10

# Security
TRUST_PROXY_HEADERS=true
TRUSTED_PROXY_IPS=127.0.0.1,::1,::ffff:127.0.0.1
REQUEST_MAX_BODY_SIZE_BYTES=5242880
AUTH_MAX_LOGIN_ATTEMPTS=5
AUTH_LOCKOUT_SECONDS=900

# Uploads
UPLOAD_MAX_FILE_SIZE_BYTES=10485760
UPLOAD_ALLOWED_MIME_TYPES=image/jpeg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document

# Email (SMTP)
EMAIL_FROM=no-reply@yems.local
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
```

## Backend Scripts

```bash
bun run dev          # Start dev server with hot reload
bun run start        # Start production server
bun run build        # TypeScript compilation
bun run test         # Run tests
bun run test:watch   # Watch mode
bun run test:coverage # Coverage report
bun run lint         # ESLint
bun run lint:fix     # Auto-fix lint issues
bun run format       # Prettier
bun run db:generate  # Generate migrations
bun run db:push      # Push schema
bun run db:migrate   # Run migrations
bun run db:seed      # Seed database
```

## Key Features

- **Role-based access control** with 9 user roles
- **JWT authentication** with refresh tokens and account lockout
- **Rate limiting** on auth endpoints
- **Audit logging** for security tracking
- **File storage** via MinIO (S3-compatible)
- **Email notifications** via BullMQ + Nodemailer
- **Exam system** with MCQ support and auto-grading
- **Billing & payments** tracking for school fees
- **CSV import** for bulk student enrollment
- **Health checks** for DB, storage, and queue services
- **Swagger API docs** at `/docs`

## License

MIT
