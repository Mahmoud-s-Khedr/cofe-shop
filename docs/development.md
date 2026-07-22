# Backend Development Environment

This project provides separate compose files for local development and production-style deployment.

- `docker-compose.dev.yml`: self-contained local stack (`app`, `nginx`, `redis`, `postgres`)
- `docker-compose.prod.yml`: production stack (`app`, `nginx`, `redis`) with external PostgreSQL

## 1) Start local dev stack

```bash
cp .env.dev.example .env
docker compose -f docker-compose.dev.yml up --build
```

## 2) Run migrations

Migrations run automatically during app startup (`npm run db:migrate` before Nest boots).

Manual run:

```bash
docker compose -f docker-compose.dev.yml exec -T app npm run db:migrate
```

## 3) Access endpoints

- API base: `http://localhost:800`
- Health (live): `http://localhost:800/api/health/live`
- Health (ready): `http://localhost:800/api/health/ready`
- Swagger: `http://localhost:800/api/docs`
- Swagger JSON: `http://localhost:800/api/docs-json`

## 4) Storage behavior

- Storage provider is `cloudinary`.
- Configure in `.env`:
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`

## 5) Reset local stack

```bash
docker compose -f docker-compose.dev.yml down -v
```

## 6) Troubleshooting

- Migration startup fails with DB connection refused:
  - Ensure you are using `.env.dev.example` values (`DATABASE_URL` should point to `postgres:5432` in dev compose).
  - Check postgres health: `docker compose -f docker-compose.dev.yml ps`.
- `DATABASE_URL must start with ...` or wrong host:
  - Recreate `.env` from the correct template and restart stack.
- `docker compose exec -T app npm run seed:admin` fails with `ts-node: not found`:
  - Production/runtime images do not include dev dependencies.
  - Use compiled command in container:
    `docker compose -f docker-compose.dev.yml exec -T app sh -lc 'ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=ChangeMe123 ADMIN_PHONE=+201000000000 npm run seed:admin:prod'`
- Admin cannot login after seed:
  - Ensure `ADMIN_EMAIL` is set and valid during seeding (email login contract).
  - Re-run admin seed with explicit `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
- Frequent `429` in heavy tests:
  - For local-only simulation, set `THROTTLE_DEV_BYPASS=true`.

## 7) Auth Test Script (Registration + Authentication)

Use the dedicated auth test runner against the live API URL.

### Prerequisites

1. Backend is reachable (`BASE_URL`, default `http://localhost:3000` for direct host-run, `http://localhost:800` for Docker/Nginx)
2. Backend runs with `OTP_DEV_MODE=true` for deterministic OTP automation

### Environment variables

- `BASE_URL` (default `http://localhost:3000`)
- `AUTH_TEST_PASSWORD` (default `AuthPass123`)
- `AUTH_TEST_TIMEOUT_MS` (default `15000`)

### Run CLI script

```bash
OTP_DEV_MODE=true BASE_URL=http://localhost:3000 npm run test:auth:cli
```

Verbose mode:

```bash
OTP_DEV_MODE=true BASE_URL=http://localhost:3000 npm run test:auth:cli -- --verbose
```

### Run Jest e2e wrapper

```bash
OTP_DEV_MODE=true BASE_URL=http://localhost:3000 npm run test:auth:e2e
```
