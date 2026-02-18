"use client";

import { FormEvent, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type MenuItem = { id: string; name: string; price: number; is_available: boolean };

export default function PricingPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [status, setStatus] = useState("");

  const load = async () => {
    const response = await fetch("/api/menu/items");
    const json = (await response.json()) as { success: boolean; data?: MenuItem[]; error?: string };
    if (json.success && json.data) {
      setItems(json.data);
    } else {
      setStatus(json.error ?? "Failed to load items");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onSave = async (event: FormEvent<HTMLFormElement>, id: string, rawPrice: string) => {
    event.preventDefault();
    const price = Number(rawPrice);
    if (!Number.isFinite(price) || price <= 0) {
      setStatus("Invalid price");
      return;
    }

    const response = await fetch("/api/menu/pricing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menu_item_id: id, price })
    });

    const json = (await response.json()) as { success: boolean; error?: string };
    setStatus(json.success ? "Price updated" : json.error ?? "Failed to update price");
    if (json.success) {
      await load();
    }
  };

  return (
    <Card>
      <h1 className="text-xl font-bold">Price Management</h1>
      <p className="mt-2 text-sm text-gray-600">Update menu prices with immediate sync to POS and preorder channels.</p>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <form
            key={item.id}
            className="flex items-center gap-2 rounded border p-3"
            onSubmit={(event) => {
              const form = new FormData(event.currentTarget);
              void onSave(event, item.id, String(form.get("price")));
            }}
          >
            <p className="w-1/2 text-sm font-medium">{item.name}</p>
            <input
              name="price"
              type="number"
              min="0"
              step="0.01"
              defaultValue={item.price}
              className="w-32 rounded border p-2 text-sm"
            />
            <Button type="submit">Save</Button>
          </form>
        ))}
      </div>
      {status && <p className="mt-3 text-sm text-gray-600">{status}</p>}
    </Card>
  );
}
