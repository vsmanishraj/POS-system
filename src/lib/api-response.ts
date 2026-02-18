import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/types/domain";
import { logEvent } from "@/lib/observability/logger";
import { recordRequestMetric } from "@/lib/observability/request-metrics";

export type RequestContext = {
  requestId: string;
  headers: HeadersInit;
  method: string;
  path: string;
  startedAt: number;
  actorUserId?: string;
  restaurantId?: string | null;
};

export function createRequestContext(req: NextRequest): RequestContext {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  return {
    requestId,
    method: req.method,
    path: req.nextUrl.pathname,
    startedAt: Date.now(),
    headers: {
      "x-request-id": requestId
    }
  };
}

export function ok<T>(ctx: RequestContext, data: T, status = 200) {
  const durationMs = Date.now() - ctx.startedAt;
  recordRequestMetric({ method: ctx.method, path: ctx.path, status, durationMs });
  logEvent({
    event: "api_response",
    requestId: ctx.requestId,
    actorUserId: ctx.actorUserId,
    restaurantId: ctx.restaurantId,
    metadata: { method: ctx.method, path: ctx.path, status, duration_ms: durationMs, success: true }
  });

  return NextResponse.json<ApiResponse<T>>(
    {
      success: true,
      data,
      meta: {
        request_id: ctx.requestId
      }
    },
    {
      status,
      headers: ctx.headers
    }
  );
}

export function fail(ctx: RequestContext, error: string, status = 400, code?: string) {
  const durationMs = Date.now() - ctx.startedAt;
  recordRequestMetric({ method: ctx.method, path: ctx.path, status, durationMs });
  logEvent({
    level: status >= 500 ? "ERROR" : "WARN",
    event: "api_response",
    requestId: ctx.requestId,
    actorUserId: ctx.actorUserId,
    restaurantId: ctx.restaurantId,
    metadata: { method: ctx.method, path: ctx.path, status, duration_ms: durationMs, success: false, code, error }
  });

  return NextResponse.json<ApiResponse>(
    {
      success: false,
      error,
      meta: {
        request_id: ctx.requestId,
        code
      }
    },
    {
      status,
      headers: ctx.headers
    }
  );
}

export function fromError(ctx: RequestContext, error: unknown, fallback = "Internal server error") {
  if (error instanceof Error) {
    return fail(ctx, error.message || fallback, 500, "INTERNAL_ERROR");
  }

  return fail(ctx, fallback, 500, "INTERNAL_ERROR");
}

export function withActorContext(ctx: RequestContext, input: { actorUserId?: string; restaurantId?: string | null }) {
  return {
    ...ctx,
    actorUserId: input.actorUserId,
    restaurantId: input.restaurantId
  } satisfies RequestContext;
}
