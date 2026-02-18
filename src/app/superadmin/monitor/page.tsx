"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type HealthPayload = {
  status: string;
  uptime_seconds: number;
  db: string;
  latency_ms: number;
  node_env: string;
  app_version: string;
  memory_mb: number;
  timestamp: string;
};

type MetricsPayload = {
  restaurants_total: number;
  open_orders_total: number;
  low_stock_alerts_open: number;
  failed_deployments_total: number;
  runtime: {
    requests_total: number;
    requests_2xx: number;
    requests_4xx: number;
    requests_5xx: number;
    success_rate_percent: number;
    rpm_1m: number;
    p50_latency_ms_1m: number;
    p95_latency_ms_1m: number;
    p99_latency_ms_1m: number;
    top_endpoints_1m: Array<{ route: string; count: number }>;
  };
  generated_at: string;
};

export default function MonitorPage() {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [metrics, setMetrics] = useState<MetricsPayload | null>(null);
  const [status, setStatus] = useState("");

  const load = async () => {
    const [healthRes, metricsRes] = await Promise.all([fetch("/api/system/health"), fetch("/api/system/metrics")]);

    const healthJson = (await healthRes.json()) as { success: boolean; data?: HealthPayload; error?: string };
    const metricsJson = (await metricsRes.json()) as { success: boolean; data?: MetricsPayload; error?: string };

    if (!healthJson.success || !healthJson.data) {
      setStatus(healthJson.error ?? "Failed to load health");
      return;
    }

    if (!metricsJson.success || !metricsJson.data) {
      setStatus(metricsJson.error ?? "Failed to load metrics");
      return;
    }

    setHealth(healthJson.data);
    setMetrics(metricsJson.data);
    setStatus("Monitoring data refreshed");
  };

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => {
      void load();
    }, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card className="md:col-span-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Platform Monitoring</h1>
          <Button onClick={() => void load()}>Refresh</Button>
        </div>
        {status && <p className="mt-2 text-sm text-gray-600">{status}</p>}
      </Card>

      <Card>
        <h2 className="text-sm font-semibold">System Status</h2>
        <p className="mt-2 text-2xl font-bold">{health?.status ?? "-"}</p>
        <p className="text-xs text-gray-500">DB: {health?.db ?? "-"}</p>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold">Uptime</h2>
        <p className="mt-2 text-2xl font-bold">{health?.uptime_seconds ?? 0}s</p>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold">Health Latency</h2>
        <p className="mt-2 text-2xl font-bold">{health?.latency_ms ?? 0}ms</p>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold">Generated</h2>
        <p className="mt-2 text-xs text-gray-600">{metrics?.generated_at ? new Date(metrics.generated_at).toLocaleString() : "-"}</p>
      </Card>
      <Card>
        <h2 className="text-sm font-semibold">Version</h2>
        <p className="mt-2 text-sm font-bold">{health?.app_version ?? "-"}</p>
        <p className="text-xs text-gray-500">{health?.node_env ?? "-"}</p>
      </Card>
      <Card>
        <h2 className="text-sm font-semibold">Memory (RSS)</h2>
        <p className="mt-2 text-2xl font-bold">{health?.memory_mb ?? 0} MB</p>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold">Restaurants</h2>
        <p className="mt-2 text-2xl font-bold">{metrics?.restaurants_total ?? 0}</p>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold">Open Orders</h2>
        <p className="mt-2 text-2xl font-bold">{metrics?.open_orders_total ?? 0}</p>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold">Open Low Stock Alerts</h2>
        <p className="mt-2 text-2xl font-bold">{metrics?.low_stock_alerts_open ?? 0}</p>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold">Failed Deployments</h2>
        <p className="mt-2 text-2xl font-bold">{metrics?.failed_deployments_total ?? 0}</p>
      </Card>
      <Card>
        <h2 className="text-sm font-semibold">RPM (1m)</h2>
        <p className="mt-2 text-2xl font-bold">{metrics?.runtime.rpm_1m ?? 0}</p>
      </Card>
      <Card>
        <h2 className="text-sm font-semibold">Success Rate</h2>
        <p className="mt-2 text-2xl font-bold">{metrics?.runtime.success_rate_percent ?? 0}%</p>
      </Card>
      <Card>
        <h2 className="text-sm font-semibold">P95 Latency (1m)</h2>
        <p className="mt-2 text-2xl font-bold">{metrics?.runtime.p95_latency_ms_1m ?? 0}ms</p>
      </Card>
      <Card>
        <h2 className="text-sm font-semibold">Error Mix</h2>
        <p className="mt-2 text-sm text-gray-700">2xx: {metrics?.runtime.requests_2xx ?? 0}</p>
        <p className="text-sm text-gray-700">4xx: {metrics?.runtime.requests_4xx ?? 0}</p>
        <p className="text-sm text-gray-700">5xx: {metrics?.runtime.requests_5xx ?? 0}</p>
      </Card>
      <Card className="md:col-span-4">
        <h2 className="text-sm font-semibold">Top Endpoints (1m)</h2>
        <div className="mt-3 grid gap-2 text-sm">
          {(metrics?.runtime.top_endpoints_1m ?? []).length === 0 ? (
            <p className="text-gray-500">No traffic recorded in last minute.</p>
          ) : (
            metrics?.runtime.top_endpoints_1m.map((entry) => (
              <div key={entry.route} className="flex items-center justify-between rounded border border-gray-200 px-3 py-2">
                <span className="font-mono text-xs">{entry.route}</span>
                <span className="font-semibold">{entry.count}</span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
