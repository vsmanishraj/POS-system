"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { subscribeInventory } from "@/lib/services/realtime.service";

type InventoryItem = { id: string; name: string; unit: string; current_stock: number; min_stock: number; expiry_date: string | null };
type AlertRow = { id: string; alert_type: string; message: string; acknowledged: boolean; created_at: string };
type RestockRow = { id: string; requested_qty: number; status: string; notes?: string | null; created_at: string; inventory_items?: { name?: string | null } | null };
type Claims = { restaurant_id: string | null };

function isLowStock(item: InventoryItem) { return item.current_stock <= item.min_stock; }

function isNearExpiry(item: InventoryItem): boolean {
  if (!item.expiry_date) return false;
  const diffMs = new Date(item.expiry_date).getTime() - Date.now();
  return diffMs > 0 && diffMs < 3 * 24 * 60 * 60 * 1000;
}

function isExpired(item: InventoryItem): boolean {
  if (!item.expiry_date) return false;
  return new Date(item.expiry_date).getTime() < Date.now();
}

function stockRowClass(item: InventoryItem): string {
  if (isExpired(item)) return "bg-red-50";
  if (isLowStock(item)) return "bg-red-50";
  if (isNearExpiry(item)) return "bg-amber-50";
  return "hover:bg-slate-50";
}

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
      fetch("/api/inventory/items"), fetch("/api/inventory/alerts"), fetch("/api/inventory/restock")
    ]);
    const itemsJson = (await itemsRes.json()) as { success: boolean; data?: InventoryItem[]; error?: string };
    const alertsJson = (await alertsRes.json()) as { success: boolean; data?: AlertRow[]; error?: string };
    const restockJson = (await restockRes.json()) as { success: boolean; data?: RestockRow[]; error?: string };

    if (!itemsJson.success || !itemsJson.data) { setStatus(itemsJson.error ?? "Failed to load inventory items"); return; }
    setItems(itemsJson.data);
    setSelectedItem((prev) => prev || itemsJson.data?.[0]?.id || "");
    if (alertsJson.success && alertsJson.data) setAlerts(alertsJson.data);
    if (restockJson.success && restockJson.data) setRestocks(restockJson.data);
  }, []);

  useEffect(() => { void loadAll(); }, [loadAll]);

  useEffect(() => {
    const loadClaims = async () => {
      const response = await fetch("/api/auth/me");
      const json = (await response.json()) as { success: boolean; data?: Claims; error?: string };
      if (!json.success || !json.data) { setStatus(json.error ?? "Failed to load tenant context"); return; }
      setClaims(json.data);
    };
    void loadClaims();
  }, []);

  useEffect(() => {
    const restaurantId = claims?.restaurant_id;
    if (!restaurantId) return;
    const channel = subscribeInventory(restaurantId, () => { void loadAll(); });
    return () => { void channel.unsubscribe(); };
  }, [claims?.restaurant_id, loadAll]);

  const requestRestock = async (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(qty);
    if (!selectedItem || !Number.isFinite(amount) || amount <= 0) { setStatus("Select item and valid quantity"); return; }
    const response = await fetch("/api/inventory/restock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "CREATE_REQUEST", inventory_item_id: selectedItem, requested_qty: amount, notes: "Auto-created from dashboard" }) });
    const json = (await response.json()) as { success: boolean; error?: string };
    setStatus(json.success ? "Restock request created" : (json.error ?? "Failed to create request"));
    if (json.success) await loadAll();
  };

  const receiveRestock = async () => {
    const amount = Number(qty);
    if (!selectedItem || !Number.isFinite(amount) || amount <= 0) { setStatus("Select item and valid quantity"); return; }
    const response = await fetch("/api/inventory/restock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "RECEIVE", inventory_item_id: selectedItem, received_qty: amount, notes: "Received into inventory" }) });
    const json = (await response.json()) as { success: boolean; error?: string };
    setStatus(json.success ? "Restock received and stock updated" : (json.error ?? "Failed to receive restock"));
    if (json.success) await loadAll();
  };

  const logWastage = async () => {
    const amount = Number(qty);
    if (!selectedItem || !Number.isFinite(amount) || amount <= 0 || !reason.trim()) { setStatus("Select item, quantity, and reason"); return; }
    const response = await fetch("/api/inventory/wastage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inventory_item_id: selectedItem, quantity: amount, reason }) });
    const json = (await response.json()) as { success: boolean; error?: string };
    setStatus(json.success ? "Wastage recorded and stock adjusted" : (json.error ?? "Failed to record wastage"));
    if (json.success) await loadAll();
  };

  const acknowledgeAlert = async (alertId: string) => {
    const response = await fetch("/api/inventory/alerts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ alert_id: alertId }) });
    const json = (await response.json()) as { success: boolean; error?: string };
    setStatus(json.success ? "Alert acknowledged" : (json.error ?? "Failed to acknowledge alert"));
    if (json.success) await loadAll();
  };

  const unacknowledgedCount = useMemo(() => alerts.filter((a) => !a.acknowledged).length, [alerts]);
  const lowStockCount = useMemo(() => items.filter(isLowStock).length, [items]);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Summary strip */}
      <div className="lg:col-span-3 flex flex-wrap gap-3">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Total Items</p>
          <p className="text-2xl font-black text-sky-600">{items.length}</p>
        </div>
        <div className={`rounded-xl border px-4 py-3 shadow-sm ${lowStockCount > 0 ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}>
          <p className="text-xs text-slate-500 uppercase tracking-wider">Low Stock</p>
          <p className={`text-2xl font-black ${lowStockCount > 0 ? "text-red-600" : "text-slate-400"}`}>{lowStockCount}</p>
        </div>
        <div className={`rounded-xl border px-4 py-3 shadow-sm ${unacknowledgedCount > 0 ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
          <p className="text-xs text-slate-500 uppercase tracking-wider">Unack. Alerts</p>
          <p className={`text-2xl font-black ${unacknowledgedCount > 0 ? "text-amber-600" : "text-slate-400"}`}>{unacknowledgedCount}</p>
        </div>
      </div>

      {/* Stock Table */}
      <Card className="lg:col-span-2 border-slate-200 bg-white shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Inventory Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Stock overview, expiry tracking, auto deduction, and wastage monitoring.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <th className="p-2">Item</th>
                <th className="p-2">Stock</th>
                <th className="p-2">Min</th>
                <th className="p-2">Unit</th>
                <th className="p-2">Expiry</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className={`border-t border-slate-100 transition ${stockRowClass(row)}`}>
                  <td className="p-2 font-medium text-slate-900">{row.name}</td>
                  <td className={`p-2 font-bold ${isLowStock(row) ? "text-red-600" : "text-slate-700"}`}>{row.current_stock}</td>
                  <td className="p-2 text-slate-500">{row.min_stock}</td>
                  <td className="p-2 text-slate-500">{row.unit}</td>
                  <td className={`p-2 ${isExpired(row) ? "font-bold text-red-600" : isNearExpiry(row) ? "font-semibold text-amber-600" : "text-slate-500"}`}>
                    {row.expiry_date ?? "—"}
                    {isExpired(row) && " ⚠ Expired"}
                    {!isExpired(row) && isNearExpiry(row) && " ⚡ Soon"}
                  </td>
                  <td className="p-2">
                    {isExpired(row) && <span className="badge badge-danger">Expired</span>}
                    {!isExpired(row) && isLowStock(row) && <span className="badge badge-danger">Low</span>}
                    {!isExpired(row) && !isLowStock(row) && isNearExpiry(row) && <span className="badge badge-warning">Near Expiry</span>}
                    {!isExpired(row) && !isLowStock(row) && !isNearExpiry(row) && <span className="badge badge-success">OK</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Operations */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <h2 className="font-semibold text-slate-900">Operations</h2>
        <form className="mt-3 grid gap-2 text-sm" onSubmit={requestRestock}>
          <select className="rounded-md border border-slate-200 bg-white p-2 text-slate-900 focus:ring-1 focus:ring-sky-400" value={selectedItem} onChange={(e) => setSelectedItem(e.target.value)}>
            <option value="">Select item</option>
            {items.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.current_stock} {item.unit})</option>)}
          </select>
          <input className="rounded-md border border-slate-200 bg-white p-2 text-slate-900 focus:ring-1 focus:ring-sky-400" type="number" step="0.01" min="0.01" placeholder="Quantity" value={qty} onChange={(e) => setQty(e.target.value)} />
          <Button type="submit">Create Restock Request</Button>
          <Button type="button" variant="secondary" onClick={receiveRestock}>Receive Restock</Button>
          <textarea className="rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-900 focus:ring-1 focus:ring-sky-400" placeholder="Wastage reason..." value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button type="button" variant="ghost" onClick={logWastage}>Log Wastage</Button>
        </form>
      </Card>

      {/* Alerts */}
      <Card className="lg:col-span-2 border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-slate-900">Low Stock & System Alerts</h2>
          {unacknowledgedCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-600">{unacknowledgedCount} new</span>
          )}
        </div>
        <div className="mt-3 space-y-2 text-sm">
          {alerts.slice(0, 8).map((alert) => (
            <div key={alert.id} className={`rounded-lg border p-3 ${alert.acknowledged ? "border-slate-200 bg-slate-50 opacity-60" : "border-amber-200 bg-amber-50"}`}>
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-800">{alert.alert_type}</p>
                {!alert.acknowledged && <span className="badge badge-warning">New</span>}
              </div>
              <p className="mt-1 text-xs text-slate-500">{alert.message}</p>
              <p className="mt-1 text-xs text-slate-400">{new Date(alert.created_at).toLocaleString()}</p>
              {!alert.acknowledged && (
                <Button className="mt-2" onClick={() => void acknowledgeAlert(alert.id)}>Acknowledge</Button>
              )}
            </div>
          ))}
          {!alerts.length && <p className="text-slate-500">No alerts.</p>}
        </div>
      </Card>

      {/* Restock Requests */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <h2 className="font-semibold text-slate-900">Recent Restock Requests</h2>
        <div className="mt-3 space-y-2 text-sm">
          {restocks.slice(0, 8).map((row) => (
            <div key={row.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <p className="font-medium text-slate-900">{row.inventory_items?.name ?? row.id}</p>
              <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                <span>Qty: {row.requested_qty}</span>
                <span className={`badge ${row.status === "RECEIVED" ? "badge-success" : row.status === "PENDING" ? "badge-warning" : "badge-muted"}`}>{row.status}</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{new Date(row.created_at).toLocaleString()}</p>
            </div>
          ))}
          {!restocks.length && <p className="text-slate-500">No restock requests.</p>}
        </div>
      </Card>

      {status && <p className="lg:col-span-3 rounded-md border border-sky-100 bg-sky-50 p-2 text-xs text-sky-700">{status}</p>}
    </div>
  );
}
