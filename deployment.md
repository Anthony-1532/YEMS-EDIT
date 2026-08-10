# YEMS Deployment Guide

This is the single, canonical deployment approach for YEMS: **Docker Compose + nginx (TLS-terminating reverse proxy)**.

> Earlier revisions of this repo contained several conflicting deployment configs (a Caddyfile, a separate `yems.conf`, and a distributed "plaintext HTTP over LAN" plan). Those have been archived (`Caddyfile.unused`, `yems.conf.unused`) and superseded by this document. Use only what's described here.

## Architecture

```
                        ┌──────────────────────────────────────────────┐
                        │                Docker host                    │
                        │                                               │
   Browser ──HTTPS──►   │  nginx (:80→:443, TLS)                        │
                        │    ├── /api/*   ──► backend  (Hono, :4000)     │
                        │    ├── /health/ ──► backend                    │
                        │    └── /        ──► frontend (Next.js, :5173)  │
                        │                                               │
                        │  backend ──► postgres (:5432)                 │
                        │          ──► redis    (:6379)                 │
                        │          ──► minio    (:9000 / console :9001) │
                        └──────────────────────────────────────────────┘
```

All services run via `docker-compose.yml`. nginx is the only component exposed to the network (ports 80/443); everything else communicates over the internal Docker network by service name.

## Prerequisites

- Docker + Docker Compose v2
- A valid TLS certificate + key at `ssl/yems.crt` and `ssl/yems.key`
  (these are **not** committed — see `ssl/README.md`. The previously committed key must be treated as compromised and reissued; see `SECURITY_BREACH_NOTICE.md`.)
- A populated `.env` at the repo root (copy from `.env.example` and fill in real secrets)

## Configuration

All secrets and tunables live in the root `.env` file, consumed by `docker-compose.yml` via `env_file` and variable interpolation. Key values:

| Variable | Purpose |
|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Postgres credentials |
| `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` | MinIO credentials |
| `JWT_SECRET` | JWT signing secret (≥32 random chars) |
| `CORS_ORIGIN` | Comma-separated allowed origins |

The backend's `DATABASE_URL`, `REDIS_URL`, and MinIO endpoint are set in `docker-compose.yml` to the internal service names (`postgres`, `redis`, `minio`) — do not point them at `localhost` inside the compose network.

> **Note:** The Redis password is currently the placeholder `YourStrongPasswordHere` in both `docker-compose.yml` (the `redis-server --requirepass` command and the backend's `REDIS_URL`). Replace both with a real secret before any non-local deployment, ideally sourced from `.env`.

## Running

```bash
# From the repo root
cp .env.example .env        # then edit .env with real secrets
docker compose build
docker compose up -d
```

Services started:

| Service | Image / Build | Internal port | Exposed |
|---|---|---|---|
| `nginx` | nginx:1-alpine | 80 / 443 | **80, 443** |
| `frontend` | `packages/frontend/Dockerfile` | 5173 | – |
| `backend` | `packages/backend/Dockerfile` | 4000 | – |
| `postgres` | postgres:16-alpine | 5432 | 5432 (dev convenience) |
| `redis` | redis:7-alpine | 6379 | 6379 (dev convenience) |
| `minio` | minio/minio | 9000 / 9001 | 9000, 9001 |

For a hardened deployment, remove the host `ports:` mappings on `postgres`, `redis`, and `minio` so only nginx is reachable from outside the Docker network.

### Database migrations & seed

```bash
docker compose exec backend bun run db:migrate
docker compose exec backend bun run db:seed   # optional demo data
```

## TLS

nginx terminates TLS on :443 and redirects all :80 traffic to :443. It mounts the cert/key read-only from `./ssl`. Security headers (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, CSP) are set on every response in `nginx/nginx.conf`.

## Health checks

- `GET /health` — basic liveness (proxied to backend)
- `GET /health/db`, `/health/storage`, `/health/queue` — dependency checks

`postgres` and `minio` have container-level healthchecks; the backend waits on them via `depends_on: condition: service_healthy`.
