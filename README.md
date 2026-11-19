# Digital Heroes Backend

Express.js API using the same route → controller → service → Prisma structure as the StudyCraft backend. Supabase provides hosted PostgreSQL, Auth token verification and private Storage.

## Structure

```text
prisma/
  schema.prisma
src/
  config/          Prisma and environment configuration
  controllers/     HTTP request/response handling
  data/            Demo catalogue and in-memory fallback
  middlewares/     Supabase auth, role checks and errors
  routes/          Express routes only
  services/        Prisma queries and business rules
  validation/      Zod request schemas
  utils/           Shared response helpers
supabase/           Service-role client
```

## Setup

1. Run `npm install`.
2. Copy `.env.example` to `.env` and add a new Supabase project's values.
3. Set `API_BASE_URL` to the public API URL, including `/api`, then set `DATABASE_URL` to the transaction pooler URL and `DIRECT_URL` to the direct/session URL.
4. Run `npm run prisma:generate` and `npm run db:deploy`. The committed migrations include the Supabase RLS, Auth trigger, constraints, indexes and private buckets.
5. Run `npm run db:seed` to add the six product families.
6. Start with `npm run dev`.

Open `http://localhost:4000/api/docs` for interactive Swagger documentation. The raw OpenAPI document is available at `http://localhost:4000/api/docs.json`.

## Authentication

The backend exposes `/api/auth/signup`, `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout` and `/api/auth/me`. Copy the `accessToken` returned by login into Swagger's **Authorize** dialog. Signup may return a null session when email confirmation is enabled in Supabase.

## Transactional email

Order, proof and production-status notifications use Resend. Set `EMAIL_ENABLED=true`, `RESEND_API_KEY`, `EMAIL_FROM` and `ADMIN_NOTIFICATION_EMAIL` in `.env`. `EMAIL_FROM` must use a sender/domain verified in Resend. Email delivery failures are logged and do not roll back successful order or proof transactions.

With `DEMO_MODE=true` and no database URL, the API starts with in-memory data for frontend review.

## Scripts

- `npm run dev` — development server with nodemon
- `npm start` — production server
- `npm test` — pricing tests
- `npm run prisma:generate` — generate Prisma Client
- `npm run db:migrate` — create/apply a development migration
- `npm run db:deploy` — apply committed production migrations
- `npm run db:seed` — upsert the six initial product families
- `npm run db:studio` — inspect data with Prisma Studio

See `API.md` for endpoints. Never expose the Supabase service-role key to either frontend.
