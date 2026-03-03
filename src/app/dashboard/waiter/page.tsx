"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type TableRow = {
  id: string;
  name: string;
  capacity: number;
  zone?: string | null;
  is_active: boolean;
  current_status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "BILL_REQUESTED" | "CLEANING";
  assigned_staff_id?: string | null;
  staff?: { full_name?: string | null; email?: string | null } | null;
};

type StaffRow = { id: string; full_name: string; role: string; is_active: boolean };
type MenuItem = { id: string; name: string; price: number; is_available: boolean };
type CartItem = { id: string; name: string; price: number; qty: number };
type TableOrder = { id: string; order_number: string; status: string; total_amount: number; priority: string; created_at: string };
type Claims = { restaurant_id: string | null };

const STATUS_CONFIG: Record<TableRow["current_status"], { label: string; border: string; bg: string; text: string; dot: string }> = {
  AVAILABLE: { label: "Available", border: "border-green-300", bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  OCCUPIED: { label: "Occupied", border: "border-amber-300", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  RESERVED: { label: "Reserved", border: "border-sky-300", bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" },
  BILL_REQUESTED: { label: "Bill Requested", border: "border-red-300", bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  CLEANING: { label: "Cleaning", border: "border-slate-300", bg: "bg-slate-50", text: "text-slate-600", dot: "bg-slate-500" }
};

export default function WaiterPage() {
  const [claims, setClaims] = useState<Claims | null>(null);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [selectedTableId, setSelectedTableId] = useState("");
  const [selectedMenuItemId, setSelectedMenuItemId] = useState("");
  const [qty, setQty] = useState("1");
  const [orderCart, setOrderCart] = useState<CartItem[]>([]);
  const [tableOrders, setTableOrders] = useState<TableOrder[]>([]);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    const [tablesRes, staffRes, menuRes, meRes] = await Promise.all([
      fetch("/api/tables"), fetch("/api/staff"), fetch("/api/menu/items"), fetch("/api/auth/me")
    ]);
    const tablesJson = (await tablesRes.json()) as { success: boolean; data?: TableRow[]; error?: string };
    const staffJson = (await staffRes.json()) as { success: boolean; data?: StaffRow[]; error?: string };
    const menuJson = (await menuRes.json()) as { success: boolean; data?: MenuItem[]; error?: string };
    const meJson = (await meRes.json()) as { success: boolean; data?: Claims; error?: string };

    if (!tablesJson.success || !tablesJson.data) { setStatus(tablesJson.error ?? "Failed to load tables"); return; }
    setTables(tablesJson.data);
    if (!selectedTableId && tablesJson.data.length) setSelectedTableId(tablesJson.data[0].id);
    if (staffJson.success && staffJson.data) setStaff(staffJson.data.filter((r) => r.is_active && (r.role === "WAITER" || r.role === "MANAGER")));
    if (menuJson.success && menuJson.data) {
      const active = menuJson.data.filter((i) => i.is_available);
      setMenu(active);
      if (!selectedMenuItemId && active.length) setSelectedMenuItemId(active[0].id);
    }
    if (meJson.success && meJson.data) setClaims(meJson.data);
  }, [selectedMenuItemId, selectedTableId]);

  const loadTableOrders = useCallback(async () => {
    if (!selectedTableId) { setTableOrders([]); return; }
    const response = await fetch(`/api/orders?view=table&table_id=${selectedTableId}`);
    const json = (await response.json()) as { success: boolean; data?: TableOrder[]; error?: string };
    if (!json.success || !json.data) { setStatus(json.error ?? "Failed to load table orders"); return; }
    setTableOrders(json.data);
  }, [selectedTableId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadTableOrders(); }, [loadTableOrders]);

  const assignWaiter = async (tableId: string, waiterId: string) => {
    const response = await fetch("/api/tables", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: tableId, assigned_staff_id: waiterId || null }) });
    const json = (await response.json()) as { success: boolean; error?: string };
    setStatus(json.success ? "Waiter assignment updated" : (json.error ?? "Assignment failed"));
    if (json.success) await load();
  };

  const tableAction = async (tableId: string, action: "REQUEST_BILL" | "MARK_OCCUPIED" | "MARK_AVAILABLE" | "MARK_RESERVED") => {
    const response = await fetch("/api/waiter/table-action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table_id: tableId, action }) });
    const json = (await response.json()) as { success: boolean; error?: string };
    setStatus(json.success ? `Table ${action.toLowerCase().replace(/_/g, " ")}` : (json.error ?? "Action failed"));
    if (json.success) { await load(); await loadTableOrders(); }
  };

  const addToOrderCart = () => {
    const item = menu.find((r) => r.id === selectedMenuItemId);
    const quantity = Number(qty);
    if (!item || !Number.isFinite(quantity) || quantity <= 0) { setStatus("Select menu item and valid quantity"); return; }
    setOrderCart((prev) => {
      const existing = prev.find((r) => r.id === item.id);
      if (existing) return prev.map((r) => (r.id === item.id ? { ...r, qty: r.qty + quantity } : r));
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: quantity }];
    });
  };

  const orderTotal = useMemo(() => orderCart.reduce((sum, item) => sum + item.qty * item.price, 0), [orderCart]);

  const submitTableOrder = async () => {
    if (!claims?.restaurant_id) { setStatus("Missing tenant context"); return; }
    if (!selectedTableId) { setStatus("Select a table"); return; }
    if (!orderCart.length) { setStatus("Add at least one item"); return; }
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurant_id: claims.restaurant_id, table_id: selectedTableId, channel: "POS", priority: "NORMAL", discount_amount: 0, items: orderCart.map((i) => ({ menu_item_id: i.id, quantity: i.qty, unit_price: i.price })) })
    });
    const json = (await response.json()) as { success: boolean; data?: { order_number: string }; error?: string };
    if (!json.success || !json.data) { setStatus(json.error ?? "Failed to create table order"); return; }
    await tableAction(selectedTableId, "MARK_OCCUPIED");
    setStatus(`Order ${json.data.order_number} created for table`);
    setOrderCart([]);
    await loadTableOrders();
  };

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<TableRow["current_status"], number>> = {};
    for (const t of tables) counts[t.current_status] = (counts[t.current_status] ?? 0) + 1;
    return counts;
  }, [tables]);

  return (
    <div className="grid gap-4">
      {/* Status Legend */}
      <Card className="border-slate-200 bg-white py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-lg font-bold text-slate-900">Waiter Interface</h1>
          <div className="flex flex-wrap gap-3">
            {(Object.entries(STATUS_CONFIG) as [TableRow["current_status"], typeof STATUS_CONFIG[TableRow["current_status"]]][]).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
                <span className="text-xs text-slate-500">{cfg.label}</span>
                {statusCounts[key] !== undefined && (
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{statusCounts[key]}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Table Grid */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <h2 className="font-semibold text-slate-900">Table Layout</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 text-sm">
            {tables.map((table) => {
              const cfg = STATUS_CONFIG[table.current_status];
              return (
                <div key={table.id} className={`group relative overflow-hidden rounded-2xl border p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${cfg.border} ${cfg.bg}`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot} shadow-sm`} />
                        <p className="font-semibold text-slate-900 tracking-tight">{table.name}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.border} bg-white/50 ${cfg.text}`}>{cfg.label}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500 font-medium">Capacity: {table.capacity} &middot; Zone: {table.zone ?? "MAIN"}</p>
                    <select
                      className="mt-3 w-full rounded-lg border border-slate-200 bg-white/80 p-2 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-colors focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400 hover:bg-white"
                      value={table.assigned_staff_id ?? ""}
                      onChange={(e) => void assignWaiter(table.id, e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {staff.map((member) => (
                        <option key={member.id} value={member.id}>{member.full_name} ({member.role})</option>
                      ))}
                    </select>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <Button variant="ghost" className="h-12 w-full text-sm font-bold bg-white/70 hover:bg-white text-slate-700 shadow-sm transition-all" onClick={() => void tableAction(table.id, "MARK_OCCUPIED")}>Occupy</Button>
                      <Button variant="ghost" className="h-12 w-full text-sm font-bold bg-white/70 hover:bg-white text-slate-700 shadow-sm transition-all" onClick={() => void tableAction(table.id, "MARK_RESERVED")}>Reserve</Button>
                      <Button variant="ghost" className="h-12 w-full text-sm font-bold bg-white/70 hover:bg-white text-slate-700 shadow-sm transition-all" onClick={() => void tableAction(table.id, "MARK_AVAILABLE")}>Available</Button>
                      <Button variant="secondary" className="h-12 w-full text-sm font-bold bg-slate-900 text-white shadow hover:bg-slate-800 transition-all" onClick={() => void tableAction(table.id, "REQUEST_BILL")}>Request Bill</Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Take Order */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <h2 className="font-semibold text-slate-900">Take Order</h2>
          <div className="mt-3 grid gap-2 text-sm">
            <select className="rounded-md border border-slate-200 bg-white p-2 text-slate-900" value={selectedTableId} onChange={(e) => setSelectedTableId(e.target.value)}>
              {tables.map((table) => (
                <option key={table.id} value={table.id}>{table.name} ({STATUS_CONFIG[table.current_status].label})</option>
              ))}
            </select>
            <div className="grid grid-cols-3 gap-2">
              <select className="col-span-2 rounded-md border border-slate-200 bg-white p-2 text-slate-900" value={selectedMenuItemId} onChange={(e) => setSelectedMenuItemId(e.target.value)}>
                {menu.map((item) => <option key={item.id} value={item.id}>{item.name} (${item.price.toFixed(2)})</option>)}
              </select>
              <input className="rounded-md border border-slate-200 bg-white p-2 text-slate-900" type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <Button onClick={addToOrderCart}>Add Item</Button>

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm">
              <p className="font-semibold text-slate-800">Cart</p>
              <div className="mt-3 space-y-2 text-sm">
                {orderCart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg bg-white p-2 text-slate-700 shadow-sm border border-slate-100">
                    <span className="font-medium">{item.name} <span className="text-slate-400 font-normal">×{item.qty}</span></span>
                    <span className="font-medium text-slate-600">${(item.qty * item.price).toFixed(2)}</span>
                  </div>
                ))}
                {!orderCart.length && (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-6 bg-slate-50/30">
                    <p className="text-xs font-medium text-slate-500">No items added</p>
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
                <span className="text-sm font-medium text-slate-500">Total</span>
                <span className="text-lg font-bold text-slate-900">${orderTotal.toFixed(2)}</span>
              </div>
              <Button className="mt-4 w-full h-10 shadow hover:shadow-md transition-shadow" onClick={submitTableOrder}>Create Table Order</Button>
            </div>

            {/* Table Order History */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="font-medium text-slate-700">Order History for Selected Table</p>
              <div className="mt-2 space-y-1 text-xs">
                {tableOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between">
                    <span className="text-slate-500">{order.order_number}</span>
                    <span className="badge badge-muted">{order.status}</span>
                    <span className="text-sky-600">${Number(order.total_amount).toFixed(2)}</span>
                  </div>
                ))}
                {!tableOrders.length && <p className="text-slate-500">No orders for this table.</p>}
              </div>
            </div>
          </div>
          {status && <p className="mt-3 rounded-md border border-sky-100 bg-sky-50 p-2 text-xs text-sky-700">{status}</p>}
        </Card>
      </div>
    </div>
  );
}
