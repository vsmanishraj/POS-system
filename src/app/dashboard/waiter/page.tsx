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

type StaffRow = {
  id: string;
  full_name: string;
  role: string;
  is_active: boolean;
};

type MenuItem = { id: string; name: string; price: number; is_available: boolean };
type CartItem = { id: string; name: string; price: number; qty: number };
type TableOrder = {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  priority: string;
  created_at: string;
};
type Claims = { restaurant_id: string | null };

const dayOptions = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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
      fetch("/api/tables"),
      fetch("/api/staff"),
      fetch("/api/menu/items"),
      fetch("/api/auth/me")
    ]);

    const tablesJson = (await tablesRes.json()) as { success: boolean; data?: TableRow[]; error?: string };
    const staffJson = (await staffRes.json()) as { success: boolean; data?: StaffRow[]; error?: string };
    const menuJson = (await menuRes.json()) as { success: boolean; data?: MenuItem[]; error?: string };
    const meJson = (await meRes.json()) as { success: boolean; data?: Claims; error?: string };

    if (!tablesJson.success || !tablesJson.data) {
      setStatus(tablesJson.error ?? "Failed to load tables");
      return;
    }

    setTables(tablesJson.data);

    if (!selectedTableId && tablesJson.data.length) {
      setSelectedTableId(tablesJson.data[0].id);
    }

    if (staffJson.success && staffJson.data) {
      setStaff(staffJson.data.filter((row) => row.is_active && (row.role === "WAITER" || row.role === "MANAGER")));
    }

    if (menuJson.success && menuJson.data) {
      const activeMenu = menuJson.data.filter((item) => item.is_available);
      setMenu(activeMenu);
      if (!selectedMenuItemId && activeMenu.length) {
        setSelectedMenuItemId(activeMenu[0].id);
      }
    }

    if (meJson.success && meJson.data) {
      setClaims(meJson.data);
    }
  }, [selectedMenuItemId, selectedTableId]);

  const loadTableOrders = useCallback(async () => {
    if (!selectedTableId) {
      setTableOrders([]);
      return;
    }

    const response = await fetch(`/api/orders?view=table&table_id=${selectedTableId}`);
    const json = (await response.json()) as { success: boolean; data?: TableOrder[]; error?: string };

    if (!json.success || !json.data) {
      setStatus(json.error ?? "Failed to load table orders");
      return;
    }

    setTableOrders(json.data);
  }, [selectedTableId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadTableOrders();
  }, [loadTableOrders]);

  const assignWaiter = async (tableId: string, waiterId: string) => {
    const response = await fetch("/api/tables", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: tableId,
        assigned_staff_id: waiterId || null
      })
    });

    const json = (await response.json()) as { success: boolean; error?: string };
    setStatus(json.success ? "Waiter assignment updated" : json.error ?? "Assignment failed");
    if (json.success) await load();
  };

  const tableAction = async (tableId: string, action: "REQUEST_BILL" | "MARK_OCCUPIED" | "MARK_AVAILABLE" | "MARK_RESERVED") => {
    const response = await fetch("/api/waiter/table-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table_id: tableId, action })
    });

    const json = (await response.json()) as { success: boolean; error?: string };
    setStatus(json.success ? `Table ${action.toLowerCase().replace("_", " ")}` : json.error ?? "Action failed");
    if (json.success) {
      await load();
      await loadTableOrders();
    }
  };

  const addToOrderCart = () => {
    const item = menu.find((row) => row.id === selectedMenuItemId);
    const quantity = Number(qty);
    if (!item || !Number.isFinite(quantity) || quantity <= 0) {
      setStatus("Select menu item and valid quantity");
      return;
    }

    setOrderCart((prev) => {
      const existing = prev.find((row) => row.id === item.id);
      if (existing) {
        return prev.map((row) => (row.id === item.id ? { ...row, qty: row.qty + quantity } : row));
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: quantity }];
    });
  };

  const orderTotal = useMemo(() => orderCart.reduce((sum, item) => sum + item.qty * item.price, 0), [orderCart]);

  const submitTableOrder = async () => {
    if (!claims?.restaurant_id) {
      setStatus("Missing tenant context");
      return;
    }
    if (!selectedTableId) {
      setStatus("Select a table");
      return;
    }
    if (!orderCart.length) {
      setStatus("Add at least one item");
      return;
    }

    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurant_id: claims.restaurant_id,
        table_id: selectedTableId,
        channel: "POS",
        priority: "NORMAL",
        discount_amount: 0,
        items: orderCart.map((item) => ({
          menu_item_id: item.id,
          quantity: item.qty,
          unit_price: item.price
        }))
      })
    });

    const json = (await response.json()) as { success: boolean; data?: { order_number: string }; error?: string };
    if (!json.success || !json.data) {
      setStatus(json.error ?? "Failed to create table order");
      return;
    }

    await tableAction(selectedTableId, "MARK_OCCUPIED");
    setStatus(`Order ${json.data.order_number} created for table`);
    setOrderCart([]);
    await loadTableOrders();
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <h1 className="text-xl font-bold">Waiter Interface</h1>
        <p className="mt-2 text-sm text-gray-600">Table layout, assignment, order-taking, status tracking, and bill requests.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 text-sm">
          {tables.map((table) => (
            <div key={table.id} className="rounded border p-3">
              <p className="font-medium">{table.name}</p>
              <p className="text-gray-500">Status: {table.current_status}</p>
              <p className="text-gray-500">Capacity: {table.capacity}</p>
              <p className="text-gray-500">Zone: {table.zone ?? "MAIN"}</p>
              <select
                className="mt-2 w-full rounded border p-2 text-xs"
                value={table.assigned_staff_id ?? ""}
                onChange={(e) => void assignWaiter(table.id, e.target.value)}
              >
                <option value="">Unassigned</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name} ({member.role})
                  </option>
                ))}
              </select>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button variant="ghost" onClick={() => void tableAction(table.id, "MARK_OCCUPIED")}>Occupy</Button>
                <Button variant="ghost" onClick={() => void tableAction(table.id, "MARK_RESERVED")}>Reserve</Button>
                <Button variant="ghost" onClick={() => void tableAction(table.id, "MARK_AVAILABLE")}>Available</Button>
                <Button variant="secondary" onClick={() => void tableAction(table.id, "REQUEST_BILL")}>Request Bill</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="font-semibold">Take Order</h2>
        <div className="mt-3 grid gap-2 text-sm">
          <select className="rounded border p-2" value={selectedTableId} onChange={(e) => setSelectedTableId(e.target.value)}>
            {tables.map((table) => (
              <option key={table.id} value={table.id}>
                {table.name} ({table.current_status})
              </option>
            ))}
          </select>
          <div className="grid grid-cols-3 gap-2">
            <select className="col-span-2 rounded border p-2" value={selectedMenuItemId} onChange={(e) => setSelectedMenuItemId(e.target.value)}>
              {menu.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} (${item.price.toFixed(2)})
                </option>
              ))}
            </select>
            <input className="rounded border p-2" type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <Button onClick={addToOrderCart}>Add Item</Button>

          <div className="rounded border p-2">
            <p className="font-medium">Current Table Cart</p>
            <div className="mt-2 space-y-1 text-xs">
              {orderCart.map((item) => (
                <p key={item.id}>
                  {item.name} x{item.qty} = ${(item.qty * item.price).toFixed(2)}
                </p>
              ))}
              {!orderCart.length && <p className="text-gray-500">No items yet.</p>}
            </div>
            <p className="mt-2 text-sm font-semibold">Total: ${orderTotal.toFixed(2)}</p>
            <Button className="mt-2 w-full" onClick={submitTableOrder}>Create Table Order</Button>
          </div>

          <div className="rounded border p-2">
            <p className="font-medium">Table Order History</p>
            <div className="mt-2 space-y-1 text-xs">
              {tableOrders.map((order) => (
                <p key={order.id}>
                  {order.order_number} • {order.status} • ${Number(order.total_amount).toFixed(2)}
                </p>
              ))}
              {!tableOrders.length && <p className="text-gray-500">No orders for selected table.</p>}
            </div>
          </div>
        </div>
        {status && <p className="mt-3 text-sm text-gray-600">{status}</p>}
      </Card>
    </div>
  );
}
