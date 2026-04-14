# Mess Management System

Production-oriented full-stack scaffold for a mess serving around 300 customers.

## Stack
- React + Vite frontend
- Node.js + Express backend
- PostgreSQL-ready schema via Prisma
- Shared TypeScript contracts for API and UI
- AI assistant layer for structured operational queries

## Structure
- `apps/web` - operator-facing React app
- `apps/api` - backend API and domain services
- `apps/api/prisma/schema.prisma` - PostgreSQL data model
- `packages/shared` - shared types and contracts

## Implemented So Far
- Customer CRUD on the API
- Monthly payment and defaulter tracking
- Attendance and walk-in entry endpoints
- Dashboard summary aggregation
- AI query endpoint for operational questions
- Mobile-friendly dashboard UI with customer intake and monthly close preview

## Local Run
1. Install dependencies in the workspace root.
2. Start the API: `npm run dev --workspace @mess/api`
3. Start the web app: `npm run dev --workspace @mess/web`

## Deployment
### 1. Deploy API (Render/Railway)
1. Deploy `apps/api` as a Node service.
2. Build command: `npm install ; npm run prisma:migrate:deploy --workspace @mess/api ; npm run build --workspace @mess/api`
3. Start command: `npm run start --workspace @mess/api`
4. Set env vars from `apps/api/.env.example`.
5. Set `DATABASE_URL` to a real PostgreSQL connection string.
6. Keep `ALLOW_IN_MEMORY_FALLBACK=false` in production (required for data safety).
7. Set `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `AUTH_SECRET` for protected admin login.
8. Add `CORS_ORIGINS` with your Vercel frontend URL.
9. The API creates the default `org-demo` organization on startup.

## Data Durability (Critical)
1. Use managed PostgreSQL with automatic backups enabled (Render Postgres, Railway, Neon, Supabase, RDS).
2. Production must always have `DATABASE_URL` set.
3. The API now fails to start if `DATABASE_URL` is missing in production.
4. In-memory mode is only for temporary local testing and must be explicitly enabled with `ALLOW_IN_MEMORY_FALLBACK=true`.

## Admin Security
1. All business endpoints are protected by bearer-token admin authentication.
2. Public endpoints are limited to health check and login/verify.
3. Use a strong `ADMIN_PASSWORD` and a long random `AUTH_SECRET` in production.
4. Rotate admin password and secret periodically.

## Backup & Restore Runbook
1. Backup schedule: daily full backup + point-in-time recovery enabled at provider level.
2. Keep backup retention for at least 30 days.
3. Weekly verification: restore latest backup into a staging database and run smoke checks.
4. Before deploying schema changes: take a manual snapshot backup.

### Manual backup example (PostgreSQL)
`pg_dump --format=custom --no-owner --no-acl "$DATABASE_URL" > mess-backup-$(date +%Y%m%d-%H%M).dump`

### Manual restore example (PostgreSQL)
`pg_restore --clean --if-exists --no-owner --no-acl --dbname "$DATABASE_URL" mess-backup-YYYYMMDD-HHMM.dump`

### 2. Deploy Web (Vercel)
1. Import this repository in Vercel.
2. Vercel reads `vercel.json` from the root for build/output settings.
3. Set `VITE_API_BASE_URL` to your deployed API URL + `/api`.
4. Deploy.

## Next Steps
1. Finish PostgreSQL provisioning and keep Prisma migrations in sync.
2. Add real attendance and payment management screens.
3. Add reporting exports and WhatsApp notifications.
4. Add multi-mess tenancy and role-based access.
