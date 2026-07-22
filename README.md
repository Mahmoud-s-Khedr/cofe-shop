# Market Place Backend

Backend service for an online marketplace, built with NestJS and PostgreSQL, with Redis-backed real-time chat and Nginx-based local routing in Docker.

## Overview

This API covers:
- Authentication with OTP flows (registration and password reset)
- User profiles and contact information
- Product listing, search, and lifecycle updates
- Ratings and admin moderation flows
- Admin moderation and warning flows
- Real-time chat with Socket.io
- File upload flow with Cloudinary

## Quick Start (TL;DR)

**Docker (recommended):**

```bashd
cp .env.dev.example .env
docker compose -f docker-compose.dev.yml up --build
```
App: http://localhost:800 · Swagger: http://localhost:800/api/docs

**Local (no Docker), against your own Postgres/Redis:**

```bash
cp .env.example .env
npm ci
npm run build
npm run db:migrate   # requires DATABASE_URL set and reachable
npm start            # or: npm run start:dev for hot-reload
```
App: http://localhost:3000

See [Quickstart (Docker-First)](#quickstart-docker-first) and [Local Development (Non-Docker)](#local-development-non-docker) below for full details.

## Tech Stack

- Node.js (>= 20)
- NestJS (TypeScript)
- PostgreSQL
- Redis (Valkey image in Docker Compose)
- Nginx (local reverse proxy in Docker Compose)
- Swagger for API docs

## Prerequisites

- Docker + Docker Compose (recommended for local setup)
- Node.js 20+ and npm (for local non-Docker workflow)
- PostgreSQL and Redis (only for local non-Docker workflow)
- For Docker with external local PostgreSQL on Linux: this stack uses a small host-network TCP proxy and expects `DATABASE_URL` to target `host.docker.internal:15432`.

## Quickstart (Docker-First)

1. Copy environment variables:

```bash
cp .env.dev.example .env
```

2. Start local stack:

```bash
docker compose up --build
```

3. Verify health:

```bash
curl -fsS http://localhost:800/api/health/live
curl -fsS http://localhost:800/api/health/ready
```

4. Optional manual migration run (recovery/debug/idempotency check):

```bash
docker compose exec -T app npm run db:migrate
```

5. Optional: stop and remove containers/volumes:

```bash
docker compose down -v
```

Notes:
- In Docker, the app container now runs `npm run db:migrate` automatically on startup before booting NestJS.
- Manual `db:migrate` remains useful to verify idempotency or recover from interrupted startup.
- `docker-compose.dev.yml` provisions local `postgres` and `redis` services for a self-contained stack.
- Docker service-to-service addresses such as `postgres` and `redis` only work inside the Compose network.

## Access Points

- App entry (through Nginx): `http://localhost:800`
- Swagger UI (through Nginx): `http://localhost:800/api/docs`
- Health (live): `http://localhost:800/api/health/live`
- Health (ready): `http://localhost:800/api/health/ready`

Notes:
- The NestJS app listens on port `3000` inside the container.
- Docker Compose exposes `3000` to the `nginx` service and publishes `800:80` for external access by default.

## Local Development (Non-Docker)

1. Install dependencies:

```bash
npm ci
```

2. Build:

```bash
npm run build
```

3. Choose one local mode:

- Direct host-run local app:

```bash
npm run build
npm start
```

- Docker dev stack:

```bash
cp .env.dev.example .env
docker compose -f docker-compose.dev.yml up --build
```

4. Database scripts (require `DATABASE_URL`):

```bash
npm run db:migrate
npm run db:validate
npm run seed:admin
npm run seed:dev
```

5. API inventory docs:

```bash
npm run docs:api-list
npm run docs:api-list:check
```

Admin seed requirements (local/dev TS path):
- `ADMIN_EMAIL` is required.
- `ADMIN_PASSWORD` is required.
- `ADMIN_PHONE` is optional but recommended for backward compatibility and contact identity.

Admin seed in Docker/production image:
- Use compiled script (`seed:admin:prod`) because `ts-node` is not installed in the runtime image.

```bash
docker compose exec -T app sh -lc 'ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=ChangeMe123 ADMIN_PHONE=+201000000000 npm run seed:admin:prod'
```

`seed:dev` requirements:
- Server is running and reachable at `BASE_URL` (`http://localhost:3000` for direct host-run, `http://localhost:800` for Docker/Nginx)
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` are set and valid (`ADMIN_PHONE` optional)
- `OTP_DEV_MODE=true` is enabled on the server so registration responses include OTP (`000000` for console provider)

## Environment Configuration

Choose an environment template, then copy it to `.env`:

```bash
cp .env.example .env       # direct host-run local app defaults
cp .env.dev.example .env   # Docker dev stack defaults
# or
cp .env.prod.example .env  # production-oriented defaults
```

`.env.example` is a complete reference that includes:
- App runtime keys read by `src/config/configuration.ts`
- Infra/tooling keys used by Docker Compose and seed scripts (`NGINX_*`, `POSTGRES_*`, `BASE_URL`, `SEED_*`)
- Script/test/simulation keys used by CLI harnesses (`ADMIN_EMAIL`, `AUTH_TEST_*`, `PROFILE_TEST_*`, `CHAT_TEST_*`, `KAYAN_FOLLOWUP_TEST_*`, `SIM_*`)

Runtime-required keys:
- Always required: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `OTP_SIGNING_SECRET`, `STORAGE_SIGNING_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Conditionally required: `RESEND_API_KEY`, `RESEND_FROM_EMAIL` when `OTP_PROVIDER=resend`

Notes:
- `OTP_PROVIDER` supports only `console` or `resend`.
- `STORAGE_PROVIDER` currently supports only `cloudinary`.
- `ADMIN_PHONES` is deprecated; prefer `users.is_admin` as source of truth.
- Script/test/simulation keys are optional for normal API runtime, but included for full CLI reproducibility.

## Full Flow Simulation (Dev)

To run concurrent simulation without `429` throttling in local development, start the server with throttle bypass enabled:

```bash
NODE_ENV=development OTP_DEV_MODE=true THROTTLE_DEV_BYPASS=true npm run start:dev
```

Then run:

```bash
NODE_ENV=development OTP_DEV_MODE=true npm run simulate
```

For direct host-run local app, default script/harness fallbacks now target `http://localhost:3000`.
For Docker/Nginx runs, override explicitly:

```bash
BASE_URL=http://localhost:800 npm run simulate:kayan
BASE_URL=http://localhost:800 npm run simulate:kayan:admin
```

Module 6 (Follow-Up + Item Chat) client-flow simulation:

```bash
# stack already running (docker compose up -d)
BASE_URL=http://localhost:800 \
ADMIN_EMAIL=admin@example.com \
ADMIN_PASSWORD=ChangeMe123 \
OTP_DEV_MODE=true \
npm run simulate:kayan:followup
```

Optional controls:
- `KAYAN_FOLLOWUP_TEST_TIMEOUT_MS` (default `20000`)
- `KAYAN_FOLLOWUP_TEST_VERBOSE` (`true`/`false`, default `true`)
- `KAYAN_FOLLOWUP_TEST_NEGATIVE` (`true`/`false`, default `true`)
- `KAYAN_FOLLOWUP_TEST_CONTINUE_ON_FAIL` (`true`/`false`, default `false`)

The simulation covers canonical Module 6 REST routes and Socket.io `/chat` events for `order`, `fault`, and `service`, then writes a JSON report under `logs/kayan-followup-test/`.

`THROTTLE_DEV_BYPASS` is only honored when `NODE_ENV=development`.

If simulation fails at `POST /auth/login (admin)` with `401 Invalid credentials`, seed admin in the same active DB environment, then rerun:

```bash
docker compose exec -T app sh -lc 'ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=ChangeMe123 ADMIN_PHONE=+201000000000 npm run seed:admin:prod'
```

If direct host-run startup fails with DB or Redis host resolution errors:
- Your `.env` is probably using Docker-only service names such as `postgres` or `redis`.
- Use `.env.example` for direct host-run local development, or override `DATABASE_URL`, `REDIS_URL`, and `BASE_URL` with host-reachable values.

## Testing and Quality

```bash
npm test
npm run test:e2e
npm run lint
npm run ci:verify
```

## Deployment

- Runbook: [docs/deployment.md](docs/deployment.md)
- Deploy script: [scripts/deploy.sh](scripts/deploy.sh)

## Documentation Index

- Development setup: [docs/development.md](docs/development.md)
- API inventory list: [docs/api-list.md](docs/api-list.md)
- Frontend/mobile integration guide: [docs/integration-guide.md](docs/integration-guide.md)
- Database schema and validation: [docs/database.md](docs/database.md)
- Software requirements: [docs/srs.md](docs/srs.md)
