# Backend Deployment Runbook

## Prerequisites
- Docker + Docker Compose installed on VPS
- `.env` configured from `.env.prod.example`
- `DATABASE_URL` points to production PostgreSQL
- Cloudinary account + API credentials
- Resend account/API key configured for OTP email

## First-time setup

```bash
cp .env.prod.example .env
# edit .env with real secrets and DB endpoint
# set RESEND_API_KEY / RESEND_FROM_EMAIL (if OTP_PROVIDER=resend)
# set CLOUDINARY_* values
npm ci
npm run build
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=ChangeMe123 ADMIN_PHONE=+201000000000 npm run seed:admin
```

## Start production compose

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## Deploy script

```bash
bash scripts/deploy.sh
```

## Provider notes
- OTP providers:
  - `OTP_PROVIDER=console` for local development only
  - `OTP_PROVIDER=resend` for production email OTP
- `OTP_DEV_MODE` should stay `false` in production.

## Manual rollback
1. Pull previous image tag.
2. Set compose image tag back to previous value.
3. `docker compose -f docker-compose.prod.yml up -d app nginx redis`
4. Validate with `bash scripts/smoke-test.sh`

## Staging validation

```bash
docker compose -f docker-compose.prod.yml exec -T app npm run db:migrate
docker compose -f docker-compose.prod.yml exec -T app npm run db:validate
docker compose -f docker-compose.prod.yml exec -T app sh -lc 'ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=ChangeMe123 ADMIN_PHONE=+201000000000 npm run seed:admin:prod'
bash scripts/smoke-test.sh
```

## Admin seeding notes

- `ADMIN_EMAIL` and `ADMIN_PASSWORD` are required for the current auth contract.
- `ADMIN_PHONE` is optional but recommended.
- Inside production containers, use `seed:admin:prod` (compiled JS). `seed:admin` depends on `ts-node` and is intended for local TypeScript environments.
