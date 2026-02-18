# Magroms POS Production Runbook

## 1. Release Gate

Run before every production deploy:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run readiness:check
```

All five commands must pass.

## 2. Integration Modes

- Keep `USE_MOCK_*` flags as `true` for dev/demo.
- Set each required flag to `false` in production once provider credentials are configured:
  - `USE_MOCK_PREORDER_PROVIDER`
  - `USE_MOCK_CRM_PROVIDER`
  - `USE_MOCK_PRINTER_PROVIDER`
  - `USE_MOCK_EMAIL_PROVIDER`
  - `USE_MOCK_SUBDOMAIN_PROVIDER`

## 3. Alerting

- Configure:
  - `CRON_ALERT_SECRET`
  - `SLACK_ALERT_WEBHOOK_URL`
  - `ALERT_MIN_SUCCESS_RATE_PERCENT`
  - `ALERT_MAX_P95_LATENCY_MS`
- Schedule a cron trigger to call:
  - `POST /api/system/alerts`
  - Header: `x-cron-secret: <CRON_ALERT_SECRET>`

## 4. Backup and Restore

### Backup

1. Enable Supabase PITR and daily snapshots.
2. Weekly logical backup:
   - `supabase db dump --linked --schema public --file backup-public.sql`
3. Upload backups to encrypted object storage with immutable retention.

### Restore Drill (Monthly)

1. Restore backup into staging project.
2. Run smoke suite:
   - authentication, order create/complete, inventory deduction, preorder sync, CRM sync.
3. Confirm RLS boundaries with two tenant users.

## 5. Incident Response

1. Check `/superadmin/monitor` for RPM, error mix, and p95 latency.
2. Pull logs for `request_id` from platform logs.
3. For provider failures:
   - switch relevant `USE_MOCK_*` flag to `true` temporarily.
   - redeploy.
4. Record incident in postmortem with root cause and prevention action.

## 6. Rollback

1. Re-deploy previous Vercel production build.
2. Roll DB changes only if migration is non-backward compatible.
3. Re-run `npm run readiness:check` and smoke tests against rolled-back version.
