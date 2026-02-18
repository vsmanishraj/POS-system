import { NextRequest } from "next/server";
import { createRequestContext, fail, fromError, ok } from "@/lib/api-response";
import { getRuntimeMetricsSnapshot } from "@/lib/observability/request-metrics";
import { sendOpsAlert } from "@/lib/integrations/alerts";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/observability/logger";

function parseNumber(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function POST(req: NextRequest) {
  const ctx = createRequestContext(req);
  const cronSecret = process.env.CRON_ALERT_SECRET;
  if (!cronSecret) return fail(ctx, "CRON_ALERT_SECRET is not configured", 500, "CONFIG_ERROR");

  const provided = req.headers.get("x-cron-secret");
  if (provided !== cronSecret) return fail(ctx, "Unauthorized", 401, "UNAUTHORIZED");

  try {
    const { error: dbError } = await supabaseAdmin.from("feature_bundles").select("id").limit(1);
    const runtime = getRuntimeMetricsSnapshot();

    const minSuccessRate = parseNumber(process.env.ALERT_MIN_SUCCESS_RATE_PERCENT, 99);
    const maxP95Ms = parseNumber(process.env.ALERT_MAX_P95_LATENCY_MS, 800);

    const incidents: Array<{ severity: "warning" | "critical"; title: string; details: Record<string, unknown> }> = [];

    if (dbError) {
      incidents.push({
        severity: "critical",
        title: "Database Health Check Failed",
        details: { error: dbError.message }
      });
    }

    if (runtime.success_rate_percent < minSuccessRate) {
      incidents.push({
        severity: "critical",
        title: "API Success Rate Breach",
        details: { threshold_percent: minSuccessRate, actual_percent: runtime.success_rate_percent }
      });
    }

    if (runtime.p95_latency_ms_1m > maxP95Ms) {
      incidents.push({
        severity: "warning",
        title: "API Latency Breach",
        details: { threshold_ms: maxP95Ms, actual_p95_ms: runtime.p95_latency_ms_1m }
      });
    }

    const sent = [];
    for (const incident of incidents) {
      const result = await sendOpsAlert({
        title: incident.title,
        severity: incident.severity,
        details: {
          ...incident.details,
          request_id: ctx.requestId,
          generated_at: new Date().toISOString(),
          rpm_1m: runtime.rpm_1m,
          requests_5xx: runtime.requests_5xx
        }
      });
      sent.push({ ...incident, alert: result });
    }

    logEvent({
      event: "ops_alert_check",
      requestId: ctx.requestId,
      metadata: {
        incidents: incidents.length,
        sent: sent.length,
        runtime
      }
    });

    return ok(ctx, {
      checked_at: new Date().toISOString(),
      incidents,
      notifications: sent
    });
  } catch (error) {
    return fromError(ctx, error, "Alert check failed");
  }
}

