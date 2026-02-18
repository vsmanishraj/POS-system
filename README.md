# Magroms POS System

Production-ready, scalable, multi-tenant, cloud POS SaaS built with Next.js App Router, TypeScript, Supabase (Postgres + Auth + RLS), Tailwind CSS, and Vercel-compatible deployment.

## Architecture Decisions

- Single deployable Next.js 16 project with App Router for all modules.
- Supabase is the primary platform for Auth, PostgreSQL, RLS, and Realtime channels.
- Multi-tenancy is enforced with strict row-level policies using JWT claims (`restaurant_id`, `role`).
- Feature bundles (`Starter`, `Pro`, `Enterprise`) define baseline capabilities; per-restaurant feature overrides are resolved from `feature_flags`.
- Provisioning is automated through `POST /api/automation/provision` and mirrored as a Supabase Edge Function (`supabase/functions/provision`).
- Integration gateway pattern is implemented in service layer to coordinate CRM + preorder sync.
- UI modules are separated by role and path (`/superadmin`, `/dashboard/admin`, `/dashboard/pos`, `/dashboard/waiter`, `/dashboard/kitchen`, `/dashboard/inventory`, `/demo`).

## Full Folder Structure

```text
.
├── .env.example
├── .github/workflows/ci-cd.yml
├── docs/PRODUCTION_RUNBOOK.md
├── middleware.ts
├── next.config.ts
├── package.json
├── scripts/readiness-check.mjs
├── src
│   ├── app
│   │   ├── api
│   │   │   ├── admin/{branding,tax}/route.ts
│   │   │   ├── analytics/reports/route.ts
│   │   │   ├── auth/login/route.ts
│   │   │   ├── automation/{provision,seed-demo}/route.ts
│   │   │   ├── crm/sync/route.ts
│   │   │   ├── feature-flags/{evaluate,toggle}/route.ts
│   │   │   ├── integration/printer/route.ts
│   │   │   ├── inventory/auto-deduct/route.ts
│   │   │   ├── menu/{categories,items,pricing}/route.ts
│   │   │   ├── orders/route.ts
│   │   │   ├── preorder/sync/route.ts
│   │   │   ├── restaurants/route.ts
│   │   │   ├── staff/route.ts
│   │   │   ├── tables/route.ts
│   │   │   └── superadmin/{bundles,deployments,logs}/route.ts
│   │   ├── auth/login/page.tsx
│   │   ├── dashboard/... 
│   │   ├── demo/page.tsx
│   │   ├── superadmin/... 
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/...
│   ├── lib
│   │   ├── analytics/reports.ts
│   │   ├── auth/{guards.ts,session.ts}
│   │   ├── integrations/{crm.ts,email.ts,preorder.ts,printer.ts,subdomain.ts}
│   │   ├── mock-ai/predictions.ts
│   │   ├── services
│   │   │   ├── admin-config.service.ts
│   │   │   ├── audit.service.ts
│   │   │   ├── demo-seed.service.ts
│   │   │   ├── feature-flags.service.ts
│   │   │   ├── integration-gateway.service.ts
│   │   │   ├── inventory.service.ts
│   │   │   ├── menu.service.ts
│   │   │   ├── order.service.ts
│   │   │   ├── provisioning.service.ts
│   │   │   └── realtime.service.ts
│   │   ├── supabase/{admin.ts,client.ts,server.ts}
│   │   ├── validations/schemas.ts
│   │   ├── constants.ts
│   │   └── utils.ts
│   └── types/{db.ts,domain.ts}
├── supabase
│   ├── config.toml
│   ├── functions/provision/index.ts
│   └── migrations
│       ├── 202602180001_init_magroms_pos.sql
│       └── 202602180003_admin_configs_and_demo.sql
└── vitest.config.ts
```

## Database + RLS

- Complete SQL schema and policies: `/Users/vsmanishrajmanish/Desktop/POS1/supabase/migrations/202602180001_init_magroms_pos.sql`
- Added admin config tables and RLS policies: `/Users/vsmanishrajmanish/Desktop/POS1/supabase/migrations/202602180003_admin_configs_and_demo.sql`
  - `tax_configurations`
  - `branding_settings`

## Feature Bundle System

- `feature_bundles` stores pricing and definitions.
- `feature_flags` stores effective features per restaurant.
- `hasFeature(restaurant_id, feature_name)` is implemented as:
  - SQL function: `has_feature` in migration.
  - TypeScript service: `/Users/vsmanishrajmanish/Desktop/POS1/src/lib/services/feature-flags.service.ts`.

## Automated Provisioning

- API endpoint: `POST /api/automation/provision`
- Service workflow (`/Users/vsmanishrajmanish/Desktop/POS1/src/lib/services/provisioning.service.ts`):
  1. Create restaurant.
  2. Seed bundle features and overrides.
  3. Create admin auth user.
  4. Create staff record.
  5. Seed initial menu, table, and inventory data.
  6. Configure subdomain.
  7. Send welcome email.
  8. Create deployment record.
  9. Write audit log and activate restaurant.
- Edge function counterpart: `/Users/vsmanishrajmanish/Desktop/POS1/supabase/functions/provision/index.ts`.

## Demo Login Matrix Seed

- API endpoint: `POST /api/automation/seed-demo`
- Service: `/Users/vsmanishrajmanish/Desktop/POS1/src/lib/services/demo-seed.service.ts`
- Creates an Enterprise demo tenant and role users:
  - `demo.admin@magroms.app`
  - `demo.manager@magroms.app`
  - `demo.cashier@magroms.app`
  - `demo.waiter@magroms.app`
  - `demo.kitchen@magroms.app`
  - `demo.inventory@magroms.app`
- Returns generated `restaurantId` and shared demo password.

## Real-Time + Integrations

- Realtime subscriptions: `/Users/vsmanishrajmanish/Desktop/POS1/src/lib/services/realtime.service.ts`
- POS ↔ preorder sync: `/Users/vsmanishrajmanish/Desktop/POS1/src/lib/integrations/preorder.ts`
- CRM sync + loyalty: `/Users/vsmanishrajmanish/Desktop/POS1/src/lib/integrations/crm.ts`
- Integration orchestrator: `/Users/vsmanishrajmanish/Desktop/POS1/src/lib/services/integration-gateway.service.ts`
- Inventory automation on order completion: `/Users/vsmanishrajmanish/Desktop/POS1/src/lib/services/inventory.service.ts`
- Simulated printers (USB/Bluetooth/Network): `/Users/vsmanishrajmanish/Desktop/POS1/src/lib/integrations/printer.ts`

## API Surface

- Provisioning: `/api/automation/provision`
- Demo seed: `/api/automation/seed-demo`
- Restaurants: `/api/restaurants`
- Bundles: `/api/superadmin/bundles`
- Deployments: `/api/superadmin/deployments`
- Logs: `/api/superadmin/logs`
- System health + metrics: `/api/system/health`, `/api/system/metrics`
- Automated alerts check (cron): `/api/system/alerts`
- Feature flags: `/api/feature-flags/evaluate`, `/api/feature-flags/toggle`
- Menu: `/api/menu/items`, `/api/menu/categories`, `/api/menu/pricing`
- Orders & payment lifecycle: `/api/orders`
- Inventory automation: `/api/inventory/auto-deduct`
- CRM sync: `/api/crm/sync`
- Preorder sync: `/api/preorder/sync`
- Printer trigger: `/api/integration/printer`
- Tax config: `/api/admin/tax`
- Branding config: `/api/admin/branding`
- Tables CRUD: `/api/tables`
- Analytics reports + AI prediction: `/api/analytics/reports`

## Security

- Supabase Auth with JWT sessions.
- Role-based routing in `/Users/vsmanishrajmanish/Desktop/POS1/middleware.ts`.
- API role guards in `/Users/vsmanishrajmanish/Desktop/POS1/src/lib/auth/guards.ts`.
- Tenant isolation at API level + PostgreSQL RLS level.
- Enterprise MFA feature is represented as a feature flag (`MFA_ENTERPRISE`) for conditional enforcement.
- Correlation IDs (`x-request-id`) are propagated from middleware to API responses.

## Observability

- Structured JSON logs: `/Users/vsmanishrajmanish/Desktop/POS1/src/lib/observability/logger.ts`
- Runtime request metrics (RPM, latency percentiles, status mix): `/Users/vsmanishrajmanish/Desktop/POS1/src/lib/observability/request-metrics.ts`
- Superadmin monitoring UI: `/Users/vsmanishrajmanish/Desktop/POS1/src/app/superadmin/monitor/page.tsx`
- Slack alert integration and cron alert evaluator: `/Users/vsmanishrajmanish/Desktop/POS1/src/lib/integrations/alerts.ts`, `/Users/vsmanishrajmanish/Desktop/POS1/src/app/api/system/alerts/route.ts`

## Production Readiness

- Environment gate script: `npm run readiness:check` (`/Users/vsmanishrajmanish/Desktop/POS1/scripts/readiness-check.mjs`)
- Runbook: `/Users/vsmanishrajmanish/Desktop/POS1/docs/PRODUCTION_RUNBOOK.md`
- Go-live checklist: `/Users/vsmanishrajmanish/Desktop/POS1/docs/GO_LIVE_CHECKLIST.md`
- Vercel env checklist: `/Users/vsmanishrajmanish/Desktop/POS1/docs/VERCEL_ENV_CHECKLIST.md`
- Provider adapters support mock/dev and live/prod modes via `USE_MOCK_*` variables in `.env.example`.

## CI/CD

- GitHub Actions pipeline at `/Users/vsmanishrajmanish/Desktop/POS1/.github/workflows/ci-cd.yml`
- Stages:
  1. Install dependencies
  2. Lint
  3. Typecheck
  4. Test
  5. Build
  6. Deploy to Vercel on `main`

## Environment Variables

Defined in `/Users/vsmanishrajmanish/Desktop/POS1/.env.example`:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `USE_MOCK_PREORDER_PROVIDER`
- `PREORDER_PROVIDER_BASE_URL`
- `PREORDER_PROVIDER_API_KEY`
- `USE_MOCK_CRM_PROVIDER`
- `CRM_PROVIDER_BASE_URL`
- `CRM_PROVIDER_API_KEY`
- `USE_MOCK_PRINTER_PROVIDER`
- `PRINTER_GATEWAY_BASE_URL`
- `PRINTER_GATEWAY_API_KEY`
- `USE_MOCK_EMAIL_PROVIDER`
- `EMAIL_PROVIDER`
- `EMAIL_FROM`
- `RESEND_API_KEY`
- `USE_MOCK_SUBDOMAIN_PROVIDER`
- `SUBDOMAIN_PROVIDER_BASE_URL`
- `SUBDOMAIN_PROVIDER_API_KEY`
- `SUBDOMAIN_ROOT_DOMAIN`
- `CRON_ALERT_SECRET`
- `ALERT_MIN_SUCCESS_RATE_PERCENT`
- `ALERT_MAX_P95_LATENCY_MS`
- `SLACK_ALERT_WEBHOOK_URL`
- `VERCEL_TOKEN`
- `VERCEL_PROJECT_ID`
- `VERCEL_ORG_ID`

## Deployment Instructions

1. Install dependencies:
   - `pnpm install`
2. Create environment file:
   - `cp .env.example .env.local`
3. Apply Supabase migration:
   - `supabase db push`
4. Deploy edge function:
   - `supabase functions deploy provision --no-verify-jwt=false`
5. Run locally:
   - `pnpm dev`
6. Validate build:
   - `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
7. Connect Vercel project and set same env vars.
8. Push to `main` to trigger CI/CD deployment.
