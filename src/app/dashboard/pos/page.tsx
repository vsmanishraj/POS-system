"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { subscribeOrders, subscribeTables } from "@/lib/services/realtime.service";

type MenuItem = { id: string; name: string; price: number; is_available: boolean };
type Claims = { restaurant_id: string | null };
type CartItem = { id: string; name: string; price: number; qty: number };
type RecentOrder = {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  channel: string;
  created_at: string;
};
type Customer = {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  loyalty_balance: number;
};
type BillRequestTable = {
  id: string;
  name: string;
  current_status: "BILL_REQUESTED";
  staff?: { full_name?: string | null } | null;
};

export default function PosPage() {
  const [claims, setClaims] = useState<Claims | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [billRequests, setBillRequests] = useState<BillRequestTable[]>([]);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [redeemPoints, setRedeemPoints] = useState("0");
  const [status, setStatus] = useState("");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRecentOrders = useCallback(async () => {
    const response = await fetch("/api/orders?view=recent");
    const json = (await response.json()) as { success: boolean; data?: RecentOrder[]; error?: string };
    if (!json.success || !json.data) {
      setStatus(json.error ?? "Failed to load recent orders");
      return;
    }
    setRecentOrders(json.data);
  }, []);

  const loadBillRequests = useCallback(async () => {
    const response = await fetch("/api/tables?status=BILL_REQUESTED");
    const json = (await response.json()) as { success: boolean; data?: BillRequestTable[]; error?: string };
    if (!json.success || !json.data) {
      setStatus(json.error ?? "Failed to load bill requests");
      return;
    }
    setBillRequests(json.data);
  }, []);

  const searchCustomers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setCustomerResults([]);
      return;
    }

    const response = await fetch(`/api/customers?q=${encodeURIComponent(query)}`);
    const json = (await response.json()) as { success: boolean; data?: Customer[]; error?: string };
    if (!json.success || !json.data) {
      setStatus(json.error ?? "Customer lookup failed");
      return;
    }

    setCustomerResults(json.data);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const meResponse = await fetch("/api/auth/me");
      const meJson = (await meResponse.json()) as { success: boolean; data?: Claims; error?: string };
      if (!meJson.success || !meJson.data?.restaurant_id) {
        setStatus(meJson.error ?? "No tenant context");
        setLoading(false);
        return;
      }

      setClaims(meJson.data);

      const menuResponse = await fetch("/api/menu/items");
      const menuJson = (await menuResponse.json()) as { success: boolean; data?: MenuItem[]; error?: string };
      if (!menuJson.success || !menuJson.data) {
        setStatus(menuJson.error ?? "Failed to load menu");
        setLoading(false);
        return;
      }

      setMenu(menuJson.data.filter((item) => item.is_available));
      await loadRecentOrders();
      await loadBillRequests();
      setLoading(false);
    };

    void load();
  }, [loadBillRequests, loadRecentOrders]);

  useEffect(() => {
    if (!claims?.restaurant_id) return;
    const channel = subscribeOrders(claims.restaurant_id, () => {
      void loadRecentOrders();
    });
    return () => {
      void channel.unsubscribe();
    };
  }, [claims?.restaurant_id, loadRecentOrders]);

  useEffect(() => {
    if (!claims?.restaurant_id) return;
    const channel = subscribeTables(claims.restaurant_id, () => {
      void loadBillRequests();
    });
    return () => {
      void channel.unsubscribe();
    };
  }, [claims?.restaurant_id, loadBillRequests]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void searchCustomers(customerSearch);
    }, 250);

    return () => clearTimeout(timer);
  }, [customerSearch, searchCustomers]);

  const addItem = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((row) => row.id === item.id);
      if (existing) {
        return prev.map((row) => (row.id === item.id ? { ...row, qty: row.qty + 1 } : row));
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1 }];
    });
  };

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.qty * item.price, 0), [cart]);
  const tax = subtotal * 0.08;
  const redeemValue = Math.max(0, Number(redeemPoints) || 0);
  const total = Math.max(0, subtotal + tax - redeemValue);

  const createCustomer = async () => {
    if (!newCustomerName || !newCustomerEmail) {
      setStatus("Enter customer name and email");
      return;
    }

    const response = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: newCustomerName,
        email: newCustomerEmail
      })
    });

    const json = (await response.json()) as { success: boolean; data?: Customer; error?: string };
    if (!json.success || !json.data) {
      setStatus(json.error ?? "Failed to create customer");
      return;
    }

    setSelectedCustomer(json.data);
    setStatus(`Customer attached: ${json.data.full_name}`);
    setNewCustomerName("");
    setNewCustomerEmail("");
    setCustomerSearch("");
    setCustomerResults([]);
  };

  const createPosOrder = async () => {
    if (!claims?.restaurant_id) {
      setStatus("Missing tenant context");
      return;
    }

    if (!cart.length) {
      setStatus("Add at least one item");
      return;
    }

    setStatus("Creating order...");

    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurant_id: claims.restaurant_id,
        customer_id: selectedCustomer?.id,
        channel: "POS",
        priority: "NORMAL",
        discount_amount: redeemValue,
        items: cart.map((item) => ({
          menu_item_id: item.id,
          quantity: item.qty,
          unit_price: item.price
        }))
      })
    });

    const json = (await response.json()) as { success: boolean; data?: { id: string; order_number: string }; error?: string };
    if (!json.success || !json.data) {
      setStatus(json.error ?? "Failed to create order");
      return;
    }

    setActiveOrderId(json.data.id);
    setStatus(`Order created: ${json.data.order_number}`);
    await loadRecentOrders();
    await loadBillRequests();
  };

  const sendKitchen = async () => {
    if (!claims?.restaurant_id || !activeOrderId) {
      setStatus("Create an order first");
      return;
    }

    const response = await fetch("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "SEND_TO_KITCHEN",
        restaurant_id: claims.restaurant_id,
        order_id: activeOrderId
      })
    });

    const json = (await response.json()) as { success: boolean; error?: string };
    setStatus(json.success ? "Sent to kitchen and KOT printed" : json.error ?? "Failed to send to kitchen");
    if (json.success) {
      await loadRecentOrders();
      await loadBillRequests();
    }
  };

  const closeBill = async () => {
    if (!claims?.restaurant_id || !activeOrderId) {
      setStatus("Create an order first");
      return;
    }

    if (selectedCustomer && redeemValue > 0) {
      const redeemResponse = await fetch("/api/loyalty/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: claims.restaurant_id,
          customer_id: selectedCustomer.id,
          order_id: activeOrderId,
          points: Math.floor(redeemValue)
        })
      });

      const redeemJson = (await redeemResponse.json()) as { success: boolean; error?: string };
      if (!redeemJson.success) {
        setStatus(redeemJson.error ?? "Failed to redeem loyalty points");
        return;
      }
    }

    const response = await fetch("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "COMPLETE",
        restaurant_id: claims.restaurant_id,
        order_id: activeOrderId,
        payment_method: "CARD",
        amount_paid: total
      })
    });

    const json = (await response.json()) as { success: boolean; error?: string };
    if (!json.success) {
      setStatus(json.error ?? "Failed to close bill");
      return;
    }

    setStatus("Payment completed, receipt printed, inventory deducted, CRM loyalty updated");
    setCart([]);
    setActiveOrderId(null);
    setRedeemPoints("0");
    await loadRecentOrders();
    await loadBillRequests();
  };

  const setTableStatus = async (tableId: string, nextStatus: "OCCUPIED" | "AVAILABLE") => {
    const response = await fetch("/api/tables", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: tableId,
        current_status: nextStatus
      })
    });

    const json = (await response.json()) as { success: boolean; error?: string };
    setStatus(json.success ? `Table marked ${nextStatus.toLowerCase()}` : json.error ?? "Table status update failed");
    if (json.success) await loadBillRequests();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <h1 className="text-xl font-bold">POS Terminal</h1>
        <p className="mt-2 text-sm text-gray-600">Create/edit orders, apply discounts, split bills, send to kitchen, close and collect payment.</p>
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          {menu.map((item) => (
            <button key={item.id} className="rounded border p-3 text-left hover:bg-gray-50" onClick={() => addItem(item)}>
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-gray-500">${item.price.toFixed(2)}</p>
            </button>
          ))}
          {!loading && menu.length === 0 && <p className="text-sm text-gray-500">No available items.</p>}
        </div>
      </Card>
      <Card>
        <h2 className="font-semibold">Current Order</h2>
        <div className="mt-3 space-y-2 text-sm">
          {cart.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded border p-2">
              <span>
                {item.name} x{item.qty}
              </span>
              <span>${(item.qty * item.price).toFixed(2)}</span>
            </div>
          ))}
          {!cart.length && <p className="text-gray-500">No items added.</p>}
        </div>

        <div className="mt-3 rounded border p-2">
          <p className="text-sm font-medium">Customer Lookup</p>
          <input
            className="mt-2 w-full rounded border p-2 text-sm"
            placeholder="Search by name/email/phone"
            value={customerSearch}
            onChange={(event) => setCustomerSearch(event.target.value)}
          />
          <div className="mt-2 max-h-28 space-y-1 overflow-auto text-sm">
            {customerResults.map((customer) => (
              <button
                key={customer.id}
                className="w-full rounded border p-2 text-left hover:bg-gray-50"
                onClick={() => {
                  setSelectedCustomer(customer);
                  setStatus(`Customer attached: ${customer.full_name}`);
                }}
              >
                {customer.full_name} ({customer.email}) - Points: {customer.loyalty_balance}
              </button>
            ))}
          </div>
          <div className="mt-2 grid gap-2">
            <input
              className="rounded border p-2 text-sm"
              placeholder="New customer name"
              value={newCustomerName}
              onChange={(event) => setNewCustomerName(event.target.value)}
            />
            <input
              className="rounded border p-2 text-sm"
              placeholder="New customer email"
              value={newCustomerEmail}
              onChange={(event) => setNewCustomerEmail(event.target.value)}
            />
            <Button onClick={createCustomer}>Create & Attach Customer</Button>
          </div>
          {selectedCustomer && (
            <p className="mt-2 text-xs text-gray-600">
              Attached: {selectedCustomer.full_name} - Loyalty: {selectedCustomer.loyalty_balance}
            </p>
          )}
        </div>

        <div className="mt-3 rounded border p-2">
          <p className="text-sm font-medium">Loyalty Redemption</p>
          <input
            className="mt-2 w-full rounded border p-2 text-sm"
            type="number"
            min="0"
            step="1"
            value={redeemPoints}
            onChange={(event) => setRedeemPoints(event.target.value)}
          />
          <p className="mt-1 text-xs text-gray-500">1 point = $1 discount</p>
        </div>

        <p className="mt-4 text-sm">Subtotal: ${subtotal.toFixed(2)}</p>
        <p className="text-sm">Tax: ${tax.toFixed(2)}</p>
        <p className="text-sm">Discount: ${redeemValue.toFixed(2)}</p>
        <p className="text-lg font-bold">Total: ${total.toFixed(2)}</p>

        <div className="mt-3 grid gap-2">
          <Button onClick={createPosOrder}>Create Order</Button>
          <Button onClick={sendKitchen}>Send to Kitchen</Button>
          <Button variant="secondary" onClick={closeBill}>
            Close Bill & Pay
          </Button>
          <Button variant="ghost" onClick={() => setStatus("Split bill flow available in payment stage")}>Split Bill</Button>
        </div>
        {status && <p className="mt-3 text-sm text-gray-600">{status}</p>}
      </Card>
      <Card className="lg:col-span-3">
        <h2 className="font-semibold">Bill Requests (Cashier Queue)</h2>
        <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
          {billRequests.map((table) => (
            <div key={table.id} className="rounded border p-2">
              <p className="font-medium">{table.name}</p>
              <p className="text-gray-600">Status: BILL_REQUESTED</p>
              <p className="text-gray-600">Assigned: {table.staff?.full_name ?? "Unassigned"}</p>
              <div className="mt-2 flex gap-2">
                <Button variant="ghost" onClick={() => void setTableStatus(table.id, "OCCUPIED")}>
                  Acknowledge
                </Button>
                <Button variant="secondary" onClick={() => void setTableStatus(table.id, "AVAILABLE")}>
                  Mark Paid
                </Button>
              </div>
            </div>
          ))}
          {!billRequests.length && <p className="text-gray-500">No bill requests.</p>}
        </div>
      </Card>
      <Card className="lg:col-span-3">
        <h2 className="font-semibold">Recent Orders (Realtime)</h2>
        <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
          {recentOrders.map((order) => (
            <div key={order.id} className="rounded border p-2">
              <p className="font-medium">{order.order_number}</p>
              <p className="text-gray-600">
                {order.status} • {order.channel}
              </p>
              <p className="text-gray-600">${Number(order.total_amount).toFixed(2)}</p>
            </div>
          ))}
          {!recentOrders.length && <p className="text-gray-500">No orders yet.</p>}
        </div>
      </Card>
    </div>
  );
}
