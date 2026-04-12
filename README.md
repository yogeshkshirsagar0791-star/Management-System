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
6. Add `CORS_ORIGINS` with your Vercel frontend URL.
7. The API creates the default `org-demo` organization on startup.

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
