import { supabaseAdmin } from "@/lib/supabase/admin";
import { createRequestContext, fail, ok } from "@/lib/api-response";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const ctx = createRequestContext(req);

  try {
    const started = Date.now();
    const { error } = await supabaseAdmin.from("feature_bundles").select("id").limit(1);

    if (error) {
      return fail(ctx, `Database unhealthy: ${error.message}`, 503, "DB_UNHEALTHY");
    }

    return ok(ctx, {
      status: "ok",
      uptime_seconds: Math.floor(process.uptime()),
      db: "reachable",
      latency_ms: Date.now() - started,
      node_env: process.env.NODE_ENV ?? "unknown",
      app_version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? process.env.npm_package_version ?? "dev",
      memory_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return fail(ctx, error instanceof Error ? error.message : "Health check failed", 503, "HEALTH_FAILED");
  }
}
