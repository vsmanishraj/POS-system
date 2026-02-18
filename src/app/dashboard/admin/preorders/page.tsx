"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Preorder = {
  id: string;
  pickup_at: string;
  status: string;
  total_amount: number;
  linked_order_id?: string | null;
  customers?: { full_name?: string | null; email?: string | null } | null;
};

type Customer = { id: string; full_name: string; email: string };

type Order = { id: string; order_number: string; status: string };

export default function PreordersPage() {
  const [preorders, setPreorders] = useState<Preorder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [pickupAt, setPickupAt] = useState("");
  const [amount, setAmount] = useState("0");
  const [linkOrderId, setLinkOrderId] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    const [preRes, customerRes, orderRes] = await Promise.all([
      fetch("/api/preorders"),
      fetch("/api/customers?q=@"),
      fetch("/api/orders?view=recent")
    ]);

    const preJson = (await preRes.json()) as { success: boolean; data?: Preorder[]; error?: string };
    const customerJson = (await customerRes.json()) as { success: boolean; data?: Customer[]; error?: string };
    const orderJson = (await orderRes.json()) as {
      success: boolean;
      data?: Array<{ id: string; order_number: string; status: string }>;
      error?: string;
    };

    if (!preJson.success || !preJson.data) {
      setStatus(preJson.error ?? "Failed to load preorders");
      return;
    }

    setPreorders(preJson.data);
    setCustomers(customerJson.success && customerJson.data ? customerJson.data : []);
    setOrders(orderJson.success && orderJson.data ? orderJson.data : []);
    if (customerJson.success && customerJson.data?.length) {
      setCustomerId((prev) => prev || customerJson.data?.[0]?.id || "");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createPreorder = async (event: FormEvent) => {
    event.preventDefault();

    const response = await fetch("/api/preorders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: customerId,
        pickup_at: new Date(pickupAt).toISOString(),
        total_amount: Number(amount)
      })
    });

    const json = (await response.json()) as { success: boolean; error?: string };
    setStatus(json.success ? "Preorder created and pickup label printed" : json.error ?? "Create failed");
    if (json.success) await load();
  };

  const setPreorderStatus = async (preorderId: string, nextStatus: string) => {
    const response = await fetch("/api/preorders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "SET_STATUS", preorder_id: preorderId, status: nextStatus })
    });

    const json = (await response.json()) as { success: boolean; error?: string };
    setStatus(json.success ? `Preorder status updated to ${nextStatus}` : json.error ?? "Status update failed");
    if (json.success) await load();
  };

  const linkPreorder = async (preorderId: string) => {
    if (!linkOrderId) {
      setStatus("Select an order to link");
      return;
    }

    const response = await fetch("/api/preorders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "LINK_ORDER", preorder_id: preorderId, order_id: linkOrderId })
    });

    const json = (await response.json()) as { success: boolean; error?: string };
    setStatus(json.success ? "Preorder linked to POS order and sync triggered" : json.error ?? "Link failed");
    if (json.success) await load();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <h2 className="font-semibold">Create Preorder</h2>
        <form className="mt-3 grid gap-2" onSubmit={createPreorder}>
          <select className="rounded border p-2 text-sm" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name} ({c.email})
              </option>
            ))}
          </select>
          <input
            className="rounded border p-2 text-sm"
            type="datetime-local"
            value={pickupAt}
            onChange={(e) => setPickupAt(e.target.value)}
            required
          />
          <input
            className="rounded border p-2 text-sm"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <Button type="submit">Create</Button>
        </form>
      </Card>

      <Card className="lg:col-span-2">
        <h2 className="font-semibold">Incoming Preorders</h2>
        <select className="mt-3 rounded border p-2 text-sm" value={linkOrderId} onChange={(e) => setLinkOrderId(e.target.value)}>
          <option value="">Select POS order for linking</option>
          {orders.map((o) => (
            <option key={o.id} value={o.id}>
              {o.order_number} ({o.status})
            </option>
          ))}
        </select>

        <div className="mt-3 space-y-2 text-sm">
          {preorders.map((row) => (
            <div key={row.id} className="rounded border p-2">
              <p className="font-medium">{row.customers?.full_name ?? row.customers?.email ?? row.id}</p>
              <p className="text-gray-600">Pickup: {new Date(row.pickup_at).toLocaleString()}</p>
              <p className="text-gray-600">Status: {row.status}</p>
              <p className="text-gray-600">Amount: ${Number(row.total_amount).toFixed(2)}</p>
              <p className="text-gray-600">Linked Order: {row.linked_order_id ?? "-"}</p>
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                <Button onClick={() => void setPreorderStatus(row.id, "CONFIRMED")}>Confirm</Button>
                <Button variant="secondary" onClick={() => void setPreorderStatus(row.id, "READY")}>Mark Ready</Button>
                <Button variant="ghost" onClick={() => void linkPreorder(row.id)}>Link to POS</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {status && <p className="lg:col-span-3 text-sm text-gray-600">{status}</p>}
    </div>
  );
}
