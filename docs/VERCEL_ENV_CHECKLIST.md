# Vercel Environment Checklist (Production)

Set these in Vercel Project Settings -> Environment Variables.

## Core App

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`

## Integration Mode Flags

- `USE_MOCK_PREORDER_PROVIDER`
- `USE_MOCK_CRM_PROVIDER`
- `USE_MOCK_PRINTER_PROVIDER`
- `USE_MOCK_EMAIL_PROVIDER`
- `USE_MOCK_SUBDOMAIN_PROVIDER`

## Preorder Provider (required if `USE_MOCK_PREORDER_PROVIDER=false`)

- `PREORDER_PROVIDER_BASE_URL`
- `PREORDER_PROVIDER_API_KEY`

## CRM Provider (required if `USE_MOCK_CRM_PROVIDER=false`)

- `CRM_PROVIDER_BASE_URL`
- `CRM_PROVIDER_API_KEY`

## Printer Gateway (required if `USE_MOCK_PRINTER_PROVIDER=false`)

- `PRINTER_GATEWAY_BASE_URL`
- `PRINTER_GATEWAY_API_KEY`

## Email Provider (required if `USE_MOCK_EMAIL_PROVIDER=false`)

- `EMAIL_PROVIDER`
- `EMAIL_FROM`
- `RESEND_API_KEY`

## Subdomain/DNS Provider (required if `USE_MOCK_SUBDOMAIN_PROVIDER=false`)

- `SUBDOMAIN_PROVIDER_BASE_URL`
- `SUBDOMAIN_PROVIDER_API_KEY`
- `SUBDOMAIN_ROOT_DOMAIN`

## Alerting and SRE

- `CRON_ALERT_SECRET`
- `SLACK_ALERT_WEBHOOK_URL`
- `ALERT_MIN_SUCCESS_RATE_PERCENT`
- `ALERT_MAX_P95_LATENCY_MS`

## CI/CD (GitHub Action deploy)

- `VERCEL_TOKEN`
- `VERCEL_PROJECT_ID`
- `VERCEL_ORG_ID`

## Optional recommendation

For first go-live, keep only integrations you can validate today in non-mock mode.  
You can keep unready channels in mock mode temporarily and flip them when validated.
