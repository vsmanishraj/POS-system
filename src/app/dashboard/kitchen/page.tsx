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

function getTimer(createdAt: string, nowMs: number): string {
  const diff = Math.max(0, nowMs - new Date(createdAt).getTime());
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function KitchenPage() {
  const [claims, setClaims] = useState<Claims | null>(null);
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [status, setStatus] = useState("");
  const [nowMs, setNowMs] = useState(0);

  const loadQueue = useCallback(async (restaurantId: string) => {
    const response = await fetch("/api/orders?view=kitchen");
    const json = (await response.json()) as { success: boolean; data?: QueueRow[]; error?: string };

    if (!json.success || !json.data) {
      setStatus(json.error ?? "Failed to load kitchen queue");
      return;
    }

    setQueue(json.data);
    setStatus(`Queue synced (${restaurantId})`);
  }, []);

  useEffect(() => {
    const load = async () => {
      const meResponse = await fetch("/api/auth/me");
      const meJson = (await meResponse.json()) as { success: boolean; data?: Claims; error?: string };
      if (!meJson.success || !meJson.data?.restaurant_id) {
        setStatus(meJson.error ?? "No tenant context");
        return;
      }

      setClaims(meJson.data);
      await loadQueue(meJson.data.restaurant_id);
    };

    void load();
  }, [loadQueue]);

  useEffect(() => {
    const restaurantId = claims?.restaurant_id;
    if (!restaurantId) return;
    const channel = subscribeOrders(restaurantId, () => {
      void loadQueue(restaurantId);
    });
    return () => {
      void channel.unsubscribe();
    };
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
      body: JSON.stringify({
        action: "SET_STATUS",
        restaurant_id: claims.restaurant_id,
        order_id: orderId,
        status: next
      })
    });

    const json = (await response.json()) as { success: boolean; error?: string };
    if (!json.success) {
      setStatus(json.error ?? "Status update failed");
      return;
    }

    await loadQueue(claims.restaurant_id);
  };

  const togglePriority = async (orderId: string, current: QueueRow["priority"]) => {
    if (!claims?.restaurant_id) return;

    const response = await fetch("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "SET_PRIORITY",
        restaurant_id: claims.restaurant_id,
        order_id: orderId,
        priority: current === "HIGH" ? "NORMAL" : "HIGH"
      })
    });

    const json = (await response.json()) as { success: boolean; error?: string };
    if (!json.success) {
      setStatus(json.error ?? "Priority update failed");
      return;
    }

    await loadQueue(claims.restaurant_id);
  };

  return (
    <Card>
      <h1 className="text-xl font-bold">Kitchen Display System</h1>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {queue.map((item) => (
          <div key={item.id} className="rounded border p-3">
            <p className="font-semibold">{item.order_number}</p>
            <p className="text-sm text-gray-600">Table: {item.tables?.name ?? "Pickup"}</p>
            <p className="text-sm text-gray-600">Status: {item.status}</p>
            <p className="text-sm text-gray-600">Timer: {getTimer(item.created_at, nowMs)}</p>
            <p className="text-sm text-gray-600">Priority: {item.priority}</p>
            {item.channel === "PREORDER" && <p className="mt-1 text-xs font-bold text-orange-600">Pre-Order</p>}
            <div className="mt-3 grid gap-2">
              <Button onClick={() => void updateStatus(item.id, "KITCHEN")}>Mark Preparing</Button>
              <Button variant="secondary" onClick={() => void updateStatus(item.id, "READY")}>
                Mark Ready
              </Button>
              <Button variant="ghost" onClick={() => void togglePriority(item.id, item.priority)}>
                Toggle Priority
              </Button>
            </div>
          </div>
        ))}
      </div>
      {status && <p className="mt-3 text-sm text-gray-600">{status}</p>}
    </Card>
  );
}
