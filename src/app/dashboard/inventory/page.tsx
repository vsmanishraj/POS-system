"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { subscribeInventory } from "@/lib/services/realtime.service";

type InventoryItem = {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  expiry_date: string | null;
};

type AlertRow = {
  id: string;
  alert_type: string;
  message: string;
  acknowledged: boolean;
  created_at: string;
};

type RestockRow = {
  id: string;
  requested_qty: number;
  status: string;
  notes?: string | null;
  created_at: string;
  inventory_items?: { name?: string | null } | null;
};

type Claims = { restaurant_id: string | null };

export default function InventoryPage() {
  const [claims, setClaims] = useState<Claims | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [restocks, setRestocks] = useState<RestockRow[]>([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [qty, setQty] = useState("1");
  const [reason, setReason] = useState("Damaged during prep");
  const [status, setStatus] = useState("");

  const loadAll = useCallback(async () => {
    const [itemsRes, alertsRes, restockRes] = await Promise.all([
      fetch("/api/inventory/items"),
      fetch("/api/inventory/alerts"),
      fetch("/api/inventory/restock")
    ]);

    const itemsJson = (await itemsRes.json()) as { success: boolean; data?: InventoryItem[]; error?: string };
    const alertsJson = (await alertsRes.json()) as { success: boolean; data?: AlertRow[]; error?: string };
    const restockJson = (await restockRes.json()) as { success: boolean; data?: RestockRow[]; error?: string };

    if (!itemsJson.success || !itemsJson.data) {
      setStatus(itemsJson.error ?? "Failed to load inventory items");
      return;
    }

    setItems(itemsJson.data);
    setSelectedItem((prev) => prev || itemsJson.data?.[0]?.id || "");

    if (alertsJson.success && alertsJson.data) {
      setAlerts(alertsJson.data);
    }

    if (restockJson.success && restockJson.data) {
      setRestocks(restockJson.data);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    const loadClaims = async () => {
      const response = await fetch("/api/auth/me");
      const json = (await response.json()) as { success: boolean; data?: Claims; error?: string };
      if (!json.success || !json.data) {
        setStatus(json.error ?? "Failed to load tenant context");
        return;
      }
      setClaims(json.data);
    };

    void loadClaims();
  }, []);

  useEffect(() => {
    const restaurantId = claims?.restaurant_id;
    if (!restaurantId) return;
    const channel = subscribeInventory(restaurantId, () => {
      void loadAll();
    });
    return () => {
      void channel.unsubscribe();
    };
  }, [claims?.restaurant_id, loadAll]);

  const requestRestock = async (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(qty);
    if (!selectedItem || !Number.isFinite(amount) || amount <= 0) {
      setStatus("Select item and valid quantity");
      return;
    }

    const response = await fetch("/api/inventory/restock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "CREATE_REQUEST",
        inventory_item_id: selectedItem,
        requested_qty: amount,
        notes: "Auto-created from dashboard"
      })
    });

    const json = (await response.json()) as { success: boolean; error?: string };
    setStatus(json.success ? "Restock request created" : json.error ?? "Failed to create request");
    if (json.success) await loadAll();
  };

  const receiveRestock = async () => {
    const amount = Number(qty);
    if (!selectedItem || !Number.isFinite(amount) || amount <= 0) {
      setStatus("Select item and valid quantity");
      return;
    }

    const response = await fetch("/api/inventory/restock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "RECEIVE",
        inventory_item_id: selectedItem,
        received_qty: amount,
        notes: "Received into inventory"
      })
    });

    const json = (await response.json()) as { success: boolean; error?: string };
    setStatus(json.success ? "Restock received and stock updated" : json.error ?? "Failed to receive restock");
    if (json.success) await loadAll();
  };

  const logWastage = async () => {
    const amount = Number(qty);
    if (!selectedItem || !Number.isFinite(amount) || amount <= 0 || !reason.trim()) {
      setStatus("Select item, quantity, and reason");
      return;
    }

    const response = await fetch("/api/inventory/wastage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inventory_item_id: selectedItem,
        quantity: amount,
        reason
      })
    });

    const json = (await response.json()) as { success: boolean; error?: string };
    setStatus(json.success ? "Wastage recorded and stock adjusted" : json.error ?? "Failed to record wastage");
    if (json.success) await loadAll();
  };

  const acknowledgeAlert = async (alertId: string) => {
    const response = await fetch("/api/inventory/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alert_id: alertId })
    });

    const json = (await response.json()) as { success: boolean; error?: string };
    setStatus(json.success ? "Alert acknowledged" : json.error ?? "Failed to acknowledge alert");
    if (json.success) await loadAll();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <h1 className="text-xl font-bold">Inventory Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Stock overview, low stock alerts, restock planning, expiry tracking, auto deduction, and wastage monitoring.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-gray-500">
                <th className="p-2">Item</th>
                <th className="p-2">Stock</th>
                <th className="p-2">Min</th>
                <th className="p-2">Unit</th>
                <th className="p-2">Expiry</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-2">{row.name}</td>
                  <td className="p-2">{row.current_stock}</td>
                  <td className="p-2">{row.min_stock}</td>
                  <td className="p-2">{row.unit}</td>
                  <td className="p-2">{row.expiry_date ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">Operations</h2>
        <form className="mt-3 grid gap-2 text-sm" onSubmit={requestRestock}>
          <select className="rounded border p-2" value={selectedItem} onChange={(e) => setSelectedItem(e.target.value)}>
            <option value="">Select item</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <input className="rounded border p-2" type="number" step="0.01" min="0.01" value={qty} onChange={(e) => setQty(e.target.value)} />
          <Button type="submit">Create Restock Request</Button>
          <Button type="button" variant="secondary" onClick={receiveRestock}>
            Receive Restock
          </Button>
          <textarea className="rounded border p-2" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button type="button" variant="ghost" onClick={logWastage}>
            Log Wastage
          </Button>
        </form>
      </Card>

      <Card className="lg:col-span-2">
        <h2 className="font-semibold">Low Stock & System Alerts</h2>
        <div className="mt-3 space-y-2 text-sm">
          {alerts.slice(0, 8).map((alert) => (
            <div key={alert.id} className="rounded border p-2">
              <p className="font-medium">{alert.alert_type}</p>
              <p className="text-gray-600">{alert.message}</p>
              <p className="text-xs text-gray-500">{new Date(alert.created_at).toLocaleString()}</p>
              {!alert.acknowledged && (
                <Button className="mt-2" onClick={() => void acknowledgeAlert(alert.id)}>
                  Acknowledge
                </Button>
              )}
            </div>
          ))}
          {!alerts.length && <p className="text-gray-500">No alerts.</p>}
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">Recent Restock Requests</h2>
        <div className="mt-3 space-y-2 text-sm">
          {restocks.slice(0, 8).map((row) => (
            <div key={row.id} className="rounded border p-2">
              <p className="font-medium">{row.inventory_items?.name ?? row.id}</p>
              <p className="text-gray-600">Qty: {row.requested_qty}</p>
              <p className="text-gray-600">Status: {row.status}</p>
              <p className="text-xs text-gray-500">{new Date(row.created_at).toLocaleString()}</p>
            </div>
          ))}
          {!restocks.length && <p className="text-gray-500">No restock requests.</p>}
        </div>
      </Card>

      {status && <p className="lg:col-span-3 text-sm text-gray-600">{status}</p>}
    </div>
  );
}
