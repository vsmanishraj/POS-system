import { beforeEach, describe, expect, it } from "vitest";
import { getRuntimeMetricsSnapshot, recordRequestMetric, resetRuntimeMetricsForTests } from "@/lib/observability/request-metrics";

describe("request-metrics", () => {
  beforeEach(() => {
    resetRuntimeMetricsForTests();
  });

  it("tracks totals and status buckets", () => {
    recordRequestMetric({ method: "GET", path: "/api/test", status: 200, durationMs: 12 });
    recordRequestMetric({ method: "POST", path: "/api/test", status: 404, durationMs: 5 });
    recordRequestMetric({ method: "POST", path: "/api/test", status: 500, durationMs: 20 });

    const metrics = getRuntimeMetricsSnapshot();

    expect(metrics.requests_total).toBe(3);
    expect(metrics.requests_2xx).toBe(1);
    expect(metrics.requests_4xx).toBe(1);
    expect(metrics.requests_5xx).toBe(1);
    expect(metrics.success_rate_percent).toBeCloseTo(33.33, 2);
  });

  it("reports top endpoints and latency percentiles", () => {
    recordRequestMetric({ method: "GET", path: "/api/a", status: 200, durationMs: 10 });
    recordRequestMetric({ method: "GET", path: "/api/a", status: 200, durationMs: 50 });
    recordRequestMetric({ method: "GET", path: "/api/b", status: 200, durationMs: 100 });

    const metrics = getRuntimeMetricsSnapshot();

    expect(metrics.rpm_1m).toBe(3);
    expect(metrics.p50_latency_ms_1m).toBe(50);
    expect(metrics.p95_latency_ms_1m).toBe(100);
    expect(metrics.top_endpoints_1m[0]).toEqual({ route: "GET /api/a", count: 2 });
  });
});
