type RequestSample = {
  ts: number;
  method: string;
  path: string;
  status: number;
  durationMs: number;
};

type RuntimeCounters = {
  total: number;
  success_2xx: number;
  client_4xx: number;
  server_5xx: number;
};

const MAX_SAMPLES = 1000;
const samples: RequestSample[] = [];
const counters: RuntimeCounters = {
  total: 0,
  success_2xx: 0,
  client_4xx: 0,
  server_5xx: 0
};

function quantile(sorted: number[], q: number) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * q) - 1));
  return sorted[idx];
}

export function recordRequestMetric(input: {
  method: string;
  path: string;
  status: number;
  durationMs: number;
}) {
  const sample: RequestSample = {
    ts: Date.now(),
    method: input.method,
    path: input.path,
    status: input.status,
    durationMs: Math.max(0, Math.round(input.durationMs))
  };

  counters.total += 1;
  if (input.status >= 500) counters.server_5xx += 1;
  else if (input.status >= 400) counters.client_4xx += 1;
  else counters.success_2xx += 1;

  samples.push(sample);
  if (samples.length > MAX_SAMPLES) samples.shift();
}

export function getRuntimeMetricsSnapshot() {
  const now = Date.now();
  const lastMinute = samples.filter((sample) => now - sample.ts <= 60_000);
  const durations = [...lastMinute.map((sample) => sample.durationMs)].sort((a, b) => a - b);
  const perEndpoint = new Map<string, number>();

  for (const sample of lastMinute) {
    const key = `${sample.method} ${sample.path}`;
    perEndpoint.set(key, (perEndpoint.get(key) ?? 0) + 1);
  }

  const topEndpoints = [...perEndpoint.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([route, count]) => ({ route, count }));

  const successRate = counters.total ? Number(((counters.success_2xx / counters.total) * 100).toFixed(2)) : 100;

  return {
    requests_total: counters.total,
    requests_2xx: counters.success_2xx,
    requests_4xx: counters.client_4xx,
    requests_5xx: counters.server_5xx,
    success_rate_percent: successRate,
    rpm_1m: lastMinute.length,
    p50_latency_ms_1m: quantile(durations, 0.5),
    p95_latency_ms_1m: quantile(durations, 0.95),
    p99_latency_ms_1m: quantile(durations, 0.99),
    top_endpoints_1m: topEndpoints
  };
}

export function resetRuntimeMetricsForTests() {
  counters.total = 0;
  counters.success_2xx = 0;
  counters.client_4xx = 0;
  counters.server_5xx = 0;
  samples.length = 0;
}
