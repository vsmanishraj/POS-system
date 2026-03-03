"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { subscribeOrders, subscribeTables } from "@/lib/services/realtime.service";

type MenuItem = { id: string; name: string; price: number; is_available: boolean; category?: string };
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

const PAYMENT_METHODS = ["CARD", "CASH", "SPLIT"] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    OPEN: "badge badge-warning",
    KITCHEN: "badge badge-info",
    READY: "badge badge-success",
    COMPLETE: "badge badge-muted",
    CANCELLED: "badge badge-danger"
  };
  return map[status] ?? "badge badge-muted";
}

export default function PosPage() {
  const [claims, setClaims] = useState<Claims | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [billRequests, setBillRequests] = useState<BillRequestTable[]>([]);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [redeemPoints, setRedeemPoints] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CARD");
  const [status, setStatus] = useState("");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRecentOrders = useCallback(async () => {
    const response = await fetch("/api/orders?view=recent");
    const json = (await response.json()) as { success: boolean; data?: RecentOrder[]; error?: string };
    if (!json.success || !json.data) { setStatus(json.error ?? "Failed to load recent orders"); return; }
    setRecentOrders(json.data);
  }, []);

  const loadBillRequests = useCallback(async () => {
    const response = await fetch("/api/tables?status=BILL_REQUESTED");
    const json = (await response.json()) as { success: boolean; data?: BillRequestTable[]; error?: string };
    if (!json.success || !json.data) { setStatus(json.error ?? "Failed to load bill requests"); return; }
    setBillRequests(json.data);
  }, []);

  const searchCustomers = useCallback(async (query: string) => {
    if (!query.trim()) { setCustomerResults([]); return; }
    const response = await fetch(`/api/customers?q=${encodeURIComponent(query)}`);
    const json = (await response.json()) as { success: boolean; data?: Customer[]; error?: string };
    if (!json.success || !json.data) { setStatus(json.error ?? "Customer lookup failed"); return; }
    setCustomerResults(json.data);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const meResponse = await fetch("/api/auth/me");
      const meJson = (await meResponse.json()) as { success: boolean; data?: Claims; error?: string };
      if (!meJson.success || !meJson.data?.restaurant_id) { setStatus(meJson.error ?? "No tenant context"); setLoading(false); return; }
      setClaims(meJson.data);
      const menuResponse = await fetch("/api/menu/items");
      const menuJson = (await menuResponse.json()) as { success: boolean; data?: MenuItem[]; error?: string };
      if (!menuJson.success || !menuJson.data) { setStatus(menuJson.error ?? "Failed to load menu"); setLoading(false); return; }
      setMenu(menuJson.data.filter((item) => item.is_available));
      await loadRecentOrders();
      await loadBillRequests();
      setLoading(false);
    };
    void load();
  }, [loadBillRequests, loadRecentOrders]);

  useEffect(() => {
    if (!claims?.restaurant_id) return;
    const channel = subscribeOrders(claims.restaurant_id, () => { void loadRecentOrders(); });
    return () => { void channel.unsubscribe(); };
  }, [claims?.restaurant_id, loadRecentOrders]);

  useEffect(() => {
    if (!claims?.restaurant_id) return;
    const channel = subscribeTables(claims.restaurant_id, () => { void loadBillRequests(); });
    return () => { void channel.unsubscribe(); };
  }, [claims?.restaurant_id, loadBillRequests]);

  useEffect(() => {
    const timer = setTimeout(() => { void searchCustomers(customerSearch); }, 250);
    return () => clearTimeout(timer);
  }, [customerSearch, searchCustomers]);

  const categories = useMemo(() => ["All", ...Array.from(new Set(menu.map((m) => m.category ?? "Other")))], [menu]);

  const filteredMenu = useMemo(
    () => (activeCategory === "All" ? menu : menu.filter((m) => (m.category ?? "Other") === activeCategory)),
    [menu, activeCategory]
  );

  const changeQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, qty: item.qty + delta } : item))
        .filter((item) => item.qty > 0)
    );
  };

  const addItem = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((row) => row.id === item.id);
      if (existing) return prev.map((row) => (row.id === item.id ? { ...row, qty: row.qty + 1 } : row));
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1 }];
    });
  };

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.qty * item.price, 0), [cart]);
  const tax = subtotal * 0.08;
  const redeemValue = Math.max(0, Number(redeemPoints) || 0);
  const total = Math.max(0, subtotal + tax - redeemValue);

  const createCustomer = async () => {
    if (!newCustomerName || !newCustomerEmail) { setStatus("Enter customer name and email"); return; }
    const response = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: newCustomerName, email: newCustomerEmail })
    });
    const json = (await response.json()) as { success: boolean; data?: Customer; error?: string };
    if (!json.success || !json.data) { setStatus(json.error ?? "Failed to create customer"); return; }
    setSelectedCustomer(json.data);
    setStatus(`Customer attached: ${json.data.full_name}`);
    setNewCustomerName(""); setNewCustomerEmail(""); setCustomerSearch(""); setCustomerResults([]);
  };

  const createPosOrder = async () => {
    if (!claims?.restaurant_id) { setStatus("Missing tenant context"); return; }
    if (!cart.length) { setStatus("Add at least one item"); return; }
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
        items: cart.map((item) => ({ menu_item_id: item.id, quantity: item.qty, unit_price: item.price }))
      })
    });
    const json = (await response.json()) as { success: boolean; data?: { id: string; order_number: string }; error?: string };
    if (!json.success || !json.data) { setStatus(json.error ?? "Failed to create order"); return; }
    setActiveOrderId(json.data.id);
    setStatus(`Order created: ${json.data.order_number}`);
    await loadRecentOrders(); await loadBillRequests();
  };

  const sendKitchen = async () => {
    if (!claims?.restaurant_id || !activeOrderId) { setStatus("Create an order first"); return; }
    const response = await fetch("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "SEND_TO_KITCHEN", restaurant_id: claims.restaurant_id, order_id: activeOrderId })
    });
    const json = (await response.json()) as { success: boolean; error?: string };
    setStatus(json.success ? "Sent to kitchen and KOT printed" : (json.error ?? "Failed to send to kitchen"));
    if (json.success) { await loadRecentOrders(); await loadBillRequests(); }
  };

  const closeBill = async () => {
    if (!claims?.restaurant_id || !activeOrderId) { setStatus("Create an order first"); return; }
    if (selectedCustomer && redeemValue > 0) {
      const redeemResponse = await fetch("/api/loyalty/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_id: claims.restaurant_id, customer_id: selectedCustomer.id, order_id: activeOrderId, points: Math.floor(redeemValue) })
      });
      const redeemJson = (await redeemResponse.json()) as { success: boolean; error?: string };
      if (!redeemJson.success) { setStatus(redeemJson.error ?? "Failed to redeem loyalty points"); return; }
    }
    const response = await fetch("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "COMPLETE", restaurant_id: claims.restaurant_id, order_id: activeOrderId, payment_method: paymentMethod, amount_paid: total })
    });
    const json = (await response.json()) as { success: boolean; error?: string };
    if (!json.success) { setStatus(json.error ?? "Failed to close bill"); return; }
    setStatus(`Payment completed via ${paymentMethod}. Receipt printed, inventory deducted, CRM updated.`);
    setCart([]); setActiveOrderId(null); setRedeemPoints("0");
    await loadRecentOrders(); await loadBillRequests();
  };

  const setTableStatus = async (tableId: string, nextStatus: "OCCUPIED" | "AVAILABLE") => {
    const response = await fetch("/api/tables", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: tableId, current_status: nextStatus })
    });
    const json = (await response.json()) as { success: boolean; error?: string };
    setStatus(json.success ? `Table marked ${nextStatus.toLowerCase()}` : (json.error ?? "Table status update failed"));
    if (json.success) await loadBillRequests();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Menu Panel */}
      <Card className="lg:col-span-2 border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">POS Terminal</h1>
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="live-dot" /> Live
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">Tap items to add to cart. Supports loyalty redemption and split billing.</p>

        {/* Category Tabs */}
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${activeCategory === cat
                ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMenu.map((item) => (
            <button
              key={item.id}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/50"
              onClick={() => addItem(item)}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-slate-50/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative">
                <p className="font-semibold text-slate-900 transition-colors group-hover:text-slate-800 tracking-tight">
                  {item.name}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  ${item.price.toFixed(2)}
                </p>
              </div>
            </button>
          ))}
          {!loading && filteredMenu.length === 0 && <p className="text-sm text-slate-500 mt-2">No available items.</p>}
        </div>
      </Card>

      {/* Order Panel */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Current Order</h2>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="text-xs text-red-500 hover:text-red-600">Clear</button>
          )}
        </div>

        {/* Cart Items */}
        <div className="mt-4 space-y-3 text-sm">
          {cart.map((item) => (
            <div key={item.id} className="group flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition-colors hover:bg-slate-50">
              <span className="font-medium text-slate-800">{item.name}</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden text-slate-600">
                  <button onClick={() => changeQty(item.id, -1)} className="flex h-7 w-7 items-center justify-center transition-colors hover:bg-slate-100">−</button>
                  <span className="w-6 text-center text-xs font-semibold text-slate-900 border-x border-slate-100">{item.qty}</span>
                  <button onClick={() => changeQty(item.id, +1)} className="flex h-7 w-7 items-center justify-center transition-colors hover:bg-slate-100">+</button>
                </div>
                <span className="w-16 text-right font-medium text-slate-600">${(item.qty * item.price).toFixed(2)}</span>
              </div>
            </div>
          ))}
          {!cart.length && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-8 text-center bg-slate-50/30">
              <p className="text-sm font-medium text-slate-500">Your cart is empty</p>
              <p className="text-xs text-slate-400 mt-1">Tap items on the left to add them</p>
            </div>
          )}
        </div>

        {/* Customer Lookup */}
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-medium text-slate-700">Customer Lookup</p>
          <input
            className="mt-2 w-full rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none"
            placeholder="Search by name / email / phone"
            value={customerSearch}
            onChange={(event) => setCustomerSearch(event.target.value)}
          />
          <div className="mt-2 max-h-28 space-y-1 overflow-auto text-sm">
            {customerResults.map((customer) => (
              <button
                key={customer.id}
                className="w-full rounded border border-transparent p-2 text-left text-xs text-slate-600 hover:bg-sky-50 hover:border-sky-100"
                onClick={() => { setSelectedCustomer(customer); setStatus(`Customer attached: ${customer.full_name}`); }}
              >
                {customer.full_name} ({customer.email}) · {customer.loyalty_balance} pts
              </button>
            ))}
          </div>
          <div className="mt-2 grid gap-2">
            <input className="rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-900 placeholder:text-slate-400" placeholder="New customer name" value={newCustomerName} onChange={(event) => setNewCustomerName(event.target.value)} />
            <input className="rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-900 placeholder:text-slate-400" placeholder="New customer email" value={newCustomerEmail} onChange={(event) => setNewCustomerEmail(event.target.value)} />
            <Button onClick={createCustomer}>Attach Customer</Button>
          </div>
          {selectedCustomer && (
            <p className="mt-2 text-xs text-sky-600">
              ✓ {selectedCustomer.full_name} · {selectedCustomer.loyalty_balance} loyalty pts
            </p>
          )}
        </div>

        {/* Loyalty Redemption */}
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-medium text-slate-700">Loyalty Redemption</p>
          <input className="mt-2 w-full rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-900" type="number" min="0" step="1" value={redeemPoints} onChange={(event) => setRedeemPoints(event.target.value)} />
          <p className="mt-1 text-xs text-slate-500">1 point = $1 discount</p>
        </div>

        {/* Totals */}
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-slate-500"><span>Tax (8%)</span><span>${tax.toFixed(2)}</span></div>
          {redeemValue > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>−${redeemValue.toFixed(2)}</span></div>}
          <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
            <span>Total</span><span>${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Method */}
        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold text-slate-600">Payment Method</p>
          <div className="flex gap-3">
            {PAYMENT_METHODS.map((pm) => (
              <button
                key={pm}
                onClick={() => setPaymentMethod(pm)}
                className={`flex-1 rounded-xl border-2 py-3 text-sm font-bold transition-all duration-200 shadow-sm ${paymentMethod === pm
                    ? "border-sky-600 bg-sky-600 text-white"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                  }`}
              >
                {pm}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 grid gap-3">
          <Button className="h-14 text-base font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all bg-sky-600 hover:bg-sky-700 text-white" onClick={createPosOrder}>Create Order</Button>
          <Button className="h-14 text-base font-bold shadow-sm hover:shadow hover:-translate-y-0.5 transition-all bg-emerald-600 hover:bg-emerald-700 text-white" onClick={sendKitchen}>Send to Kitchen 🍳</Button>
          <Button variant="secondary" className="h-14 text-base font-bold shadow-sm hover:shadow hover:-translate-y-0.5 transition-all bg-slate-900 text-white hover:bg-slate-800" onClick={closeBill}>Close Bill ({paymentMethod})</Button>
        </div>
        {status && <p className="mt-4 rounded-xl border border-sky-100 bg-sky-50 p-3 text-sm font-semibold text-sky-700 animate-in fade-in">{status}</p>}
      </Card>

      {/* Bill Requests */}
      <Card className="lg:col-span-3 border-slate-200 bg-white shadow-sm">
        <h2 className="font-semibold text-slate-900">
          Bill Requests
          {billRequests.length > 0 && (
            <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">{billRequests.length}</span>
          )}
        </h2>
        <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
          {billRequests.map((table) => (
            <div key={table.id} className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="font-medium text-slate-900">{table.name}</p>
              <p className="text-xs text-slate-500">Assigned: {table.staff?.full_name ?? "Unassigned"}</p>
              <div className="mt-2 flex gap-2">
                <Button variant="ghost" onClick={() => void setTableStatus(table.id, "OCCUPIED")}>Acknowledge</Button>
                <Button variant="secondary" onClick={() => void setTableStatus(table.id, "AVAILABLE")}>Mark Paid</Button>
              </div>
            </div>
          ))}
          {!billRequests.length && <p className="text-slate-500">No bill requests.</p>}
        </div>
      </Card>

      {/* Recent Orders */}
      <Card className="lg:col-span-3 border-transparent bg-white/60 shadow-none">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-bold text-slate-900">Recent Orders</h2>
          <span className="live-dot ml-2" />
        </div>
        <div className="grid gap-4 text-sm md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {recentOrders.map((order) => (
            <div key={order.id} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
              <div className="flex items-center justify-between mb-3">
                <p className="text-lg font-bold text-slate-900 tracking-tight">{order.order_number}</p>
                <span className={statusBadge(order.status)}>{order.status}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-2">
                <p className="text-sm font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{order.channel}</p>
                <p className="text-lg font-black text-slate-900">${Number(order.total_amount).toFixed(2)}</p>
              </div>
            </div>
          ))}
          {!recentOrders.length && (
            <div className="col-span-full py-12 text-center rounded-2xl border border-dashed border-slate-300 bg-white/50">
              <p className="text-base font-medium text-slate-500">No orders yet.</p>
              <p className="text-sm text-slate-400 mt-1">Orders you create will appear here.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
