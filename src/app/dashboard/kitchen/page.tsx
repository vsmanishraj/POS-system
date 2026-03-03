"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { subscribeOrders } from "@/lib/services/realtime.service";

type QueueRow = {
  id: string;
  order_number: string;
  status: "OPEN" | "KITCHEN" | "READY";
  priority: "NORMAL" | "HIGH";
  channel: "POS" | "PREORDER";
  created_at: string;
  tables?: { name?: string | null } | null;
};

type Claims = { restaurant_id: string | null };

function getElapsedMs(createdAt: string, nowMs: number) {
  return Math.max(0, nowMs - new Date(createdAt).getTime());
}

function formatTimer(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function urgencyClass(ms: number): string {
  if (ms < 10 * 60 * 1000) return "border-green-200 bg-green-50";   // < 10 min
  if (ms < 20 * 60 * 1000) return "border-amber-200 bg-amber-50";   // 10–20 min
  return "border-red-200 bg-red-50";                                  // > 20 min
}

function timerColour(ms: number): string {
  if (ms < 10 * 60 * 1000) return "text-green-600";
  if (ms < 20 * 60 * 1000) return "text-amber-600";
  return "text-red-600 font-bold";
}

const LANES: { key: QueueRow["status"]; label: string; colour: string }[] = [
  { key: "OPEN", label: "Incoming", colour: "text-amber-600" },
  { key: "KITCHEN", label: "Preparing", colour: "text-sky-600" },
  { key: "READY", label: "Ready", colour: "text-green-600" }
];

export default function KitchenPage() {
  const [claims, setClaims] = useState<Claims | null>(null);
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [status, setStatus] = useState("");
  const [nowMs, setNowMs] = useState(0);

  const loadQueue = useCallback(async (restaurantId: string) => {
    const response = await fetch("/api/orders?view=kitchen");
    const json = (await response.json()) as { success: boolean; data?: QueueRow[]; error?: string };
    if (!json.success || !json.data) { setStatus(json.error ?? "Failed to load kitchen queue"); return; }
    setQueue(json.data);
    setStatus(`Queue synced (${restaurantId})`);
  }, []);

  useEffect(() => {
    const load = async () => {
      const meResponse = await fetch("/api/auth/me");
      const meJson = (await meResponse.json()) as { success: boolean; data?: Claims; error?: string };
      if (!meJson.success || !meJson.data?.restaurant_id) { setStatus(meJson.error ?? "No tenant context"); return; }
      setClaims(meJson.data);
      await loadQueue(meJson.data.restaurant_id);
    };
    void load();
  }, [loadQueue]);

  useEffect(() => {
    const restaurantId = claims?.restaurant_id;
    if (!restaurantId) return;
    const channel = subscribeOrders(restaurantId, () => { void loadQueue(restaurantId); });
    return () => { void channel.unsubscribe(); };
  }, [claims?.restaurant_id, loadQueue]);

  useEffect(() => {
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const updateStatus = async (orderId: string, next: QueueRow["status"]) => {
    if (!claims?.restaurant_id) return;
    const response = await fetch("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "SET_STATUS", restaurant_id: claims.restaurant_id, order_id: orderId, status: next })
    });
    const json = (await response.json()) as { success: boolean; error?: string };
    if (!json.success) { setStatus(json.error ?? "Status update failed"); return; }
    await loadQueue(claims.restaurant_id);
  };

  const togglePriority = async (orderId: string, current: QueueRow["priority"]) => {
    if (!claims?.restaurant_id) return;
    const response = await fetch("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "SET_PRIORITY", restaurant_id: claims.restaurant_id, order_id: orderId, priority: current === "HIGH" ? "NORMAL" : "HIGH" })
    });
    const json = (await response.json()) as { success: boolean; error?: string };
    if (!json.success) { setStatus(json.error ?? "Priority update failed"); return; }
    await loadQueue(claims.restaurant_id);
  };

  return (
    <div className="grid gap-4">
      {/* Header */}
      <Card className="border-slate-200 bg-white py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">Kitchen Display System</h1>
            <span className="live-dot" />
          </div>
          {/* Lane count badges */}
          <div className="flex gap-3">
            {LANES.map((lane) => {
              const count = queue.filter((q) => q.status === lane.key).length;
              return (
                <div key={lane.key} className="flex items-center gap-1.5">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${lane.colour}`}>{lane.label}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Lanes */}
      <div className="grid gap-4 lg:grid-cols-3">
        {LANES.map((lane) => (
          <div key={lane.key}>
            <div className={`mb-3 border-b border-slate-200 pb-2 ${lane.colour} flex items-center gap-2`}>
              <span className="text-sm font-bold uppercase tracking-wider">{lane.label}</span>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                {queue.filter((q) => q.status === lane.key).length}
              </span>
            </div>
            <div className="grid gap-3">
              {queue
                .filter((item) => item.status === lane.key)
                .sort((a, b) => {
                  if (a.priority === "HIGH" && b.priority !== "HIGH") return -1;
                  if (b.priority === "HIGH" && a.priority !== "HIGH") return 1;
                  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                })
                .map((item) => {
                  const elapsed = getElapsedMs(item.created_at, nowMs);
                  return (
                    <div key={item.id} className={`rounded-xl border p-4 shadow-sm ${urgencyClass(elapsed)}`}>
                      <div className="flex items-start justify-between">
                        <p className="font-bold text-slate-900">{item.order_number}</p>
                        {item.priority === "HIGH" && (
                          <span className="badge badge-danger">🔥 HIGH</span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">Table: {item.tables?.name ?? "Pickup"}</p>
                      {item.channel === "PREORDER" && (
                        <span className="mt-1 badge badge-warning">Pre-Order</span>
                      )}
                      <p className={`mt-2 text-lg font-mono font-bold ${timerColour(elapsed)}`}>
                        ⏱ {formatTimer(elapsed)}
                      </p>
                      <div className="mt-3 grid gap-2">
                        {item.status === "OPEN" && (
                          <Button onClick={() => void updateStatus(item.id, "KITCHEN")}>
                            Mark Preparing 🍳
                          </Button>
                        )}
                        {item.status === "KITCHEN" && (
                          <Button variant="secondary" onClick={() => void updateStatus(item.id, "READY")}>
                            Mark Ready ✅
                          </Button>
                        )}
                        <Button variant="ghost" className="hover:bg-black/5" onClick={() => void togglePriority(item.id, item.priority)}>
                          {item.priority === "HIGH" ? "Remove Priority" : "⬆ Escalate"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              {queue.filter((q) => q.status === lane.key).length === 0 && (
                <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
                  No orders
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {status && <p className="rounded-md border border-sky-100 bg-sky-50 p-2 text-xs text-sky-700">{status}</p>}
    </div>
  );
}
