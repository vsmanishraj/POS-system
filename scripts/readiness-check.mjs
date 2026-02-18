#!/usr/bin/env node
const required = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_JWT_SECRET"
];

function parseBool(value, fallback) {
  if (value === undefined) return fallback;
  return String(value).toLowerCase() === "true";
}

const checks = [];

for (const key of required) {
  checks.push({ key, ok: Boolean(process.env[key]) });
}

const mockFlags = {
  USE_MOCK_PREORDER_PROVIDER: parseBool(process.env.USE_MOCK_PREORDER_PROVIDER, true),
  USE_MOCK_CRM_PROVIDER: parseBool(process.env.USE_MOCK_CRM_PROVIDER, true),
  USE_MOCK_PRINTER_PROVIDER: parseBool(process.env.USE_MOCK_PRINTER_PROVIDER, true),
  USE_MOCK_EMAIL_PROVIDER: parseBool(process.env.USE_MOCK_EMAIL_PROVIDER, true),
  USE_MOCK_SUBDOMAIN_PROVIDER: parseBool(process.env.USE_MOCK_SUBDOMAIN_PROVIDER, true)
};

if (!mockFlags.USE_MOCK_PREORDER_PROVIDER) {
  checks.push({ key: "PREORDER_PROVIDER_BASE_URL", ok: Boolean(process.env.PREORDER_PROVIDER_BASE_URL) });
  checks.push({ key: "PREORDER_PROVIDER_API_KEY", ok: Boolean(process.env.PREORDER_PROVIDER_API_KEY) });
}

if (!mockFlags.USE_MOCK_CRM_PROVIDER) {
  checks.push({ key: "CRM_PROVIDER_BASE_URL", ok: Boolean(process.env.CRM_PROVIDER_BASE_URL) });
  checks.push({ key: "CRM_PROVIDER_API_KEY", ok: Boolean(process.env.CRM_PROVIDER_API_KEY) });
}

if (!mockFlags.USE_MOCK_PRINTER_PROVIDER) {
  checks.push({ key: "PRINTER_GATEWAY_BASE_URL", ok: Boolean(process.env.PRINTER_GATEWAY_BASE_URL) });
  checks.push({ key: "PRINTER_GATEWAY_API_KEY", ok: Boolean(process.env.PRINTER_GATEWAY_API_KEY) });
}

if (!mockFlags.USE_MOCK_EMAIL_PROVIDER) {
  checks.push({ key: "EMAIL_PROVIDER", ok: Boolean(process.env.EMAIL_PROVIDER) });
  checks.push({ key: "EMAIL_FROM", ok: Boolean(process.env.EMAIL_FROM) });
  checks.push({ key: "RESEND_API_KEY", ok: Boolean(process.env.RESEND_API_KEY) });
}

if (!mockFlags.USE_MOCK_SUBDOMAIN_PROVIDER) {
  checks.push({ key: "SUBDOMAIN_PROVIDER_BASE_URL", ok: Boolean(process.env.SUBDOMAIN_PROVIDER_BASE_URL) });
  checks.push({ key: "SUBDOMAIN_PROVIDER_API_KEY", ok: Boolean(process.env.SUBDOMAIN_PROVIDER_API_KEY) });
  checks.push({ key: "SUBDOMAIN_ROOT_DOMAIN", ok: Boolean(process.env.SUBDOMAIN_ROOT_DOMAIN) });
}

const failed = checks.filter((item) => !item.ok);

console.log("Readiness check results:");
for (const item of checks) {
  console.log(`- ${item.ok ? "OK " : "MISS"} ${item.key}`);
}

if (failed.length) {
  console.error(`\nReadiness failed: ${failed.length} required environment variable(s) missing.`);
  process.exit(1);
}

console.log("\nReadiness environment check passed.");
