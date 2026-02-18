# Magroms POS Go-Live Checklist

## 1. Supabase Production

1. Create production Supabase project.
2. Link CLI:
   - `supabase link --project-ref <prod-project-ref>`
3. Apply schema:
   - `supabase db push`
4. Deploy edge function:
   - `supabase functions deploy provision --project-ref <prod-project-ref>`
5. Confirm Auth providers and redirect URLs are configured.

## 2. Vercel Production

1. Import repository in Vercel.
2. Set production branch to `main`.
3. Add all required environment variables (see `docs/VERCEL_ENV_CHECKLIST.md`).
4. Deploy to production once.

## 3. Domain and SSL

1. Add production domain to Vercel.
2. Configure DNS records at your registrar.
3. If using restaurant subdomains, configure wildcard DNS and provider integration credentials.
4. Verify HTTPS for root domain and sample tenant subdomain.

## 4. Real Integrations

1. Set `USE_MOCK_*` flags to `false` for live channels.
2. Validate each integration in staging first:
   - Preorder sync
   - CRM sync
   - Printer gateway
   - Email
   - Subdomain provisioning

## 5. Observability and Alerting

1. Set `CRON_ALERT_SECRET`.
2. Set `SLACK_ALERT_WEBHOOK_URL`.
3. Configure periodic call to:
   - `POST /api/system/alerts`
   - Header: `x-cron-secret: <CRON_ALERT_SECRET>`
4. Verify an alert is delivered by temporarily lowering threshold.

## 6. Final Validation Gate

Run all of these in production config:

```bash
npm run readiness:check
npm run lint
npm run typecheck
npm run test
npm run build
```

All commands must pass.

## 7. Smoke Test (Production)

1. Superadmin creates a real restaurant tenant.
2. Provisioning flow completes (restaurant + admin user + feature flags).
3. Restaurant admin logs in and updates menu.
4. POS creates order -> sends kitchen -> closes with payment.
5. Inventory auto-deduct occurs.
6. CRM sync and preorder sync succeed.
7. `/superadmin/monitor` shows healthy status.

## 8. Launch Decision

Mark system as go-live only if:

1. Validation gate passed.
2. Smoke test passed.
3. Alerts are firing correctly.
4. Backup/PITR is enabled.
5. Rollback owner is assigned.
