"use client";

import { FormEvent, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Bundle = {
  id: string;
  name: "Starter" | "Pro" | "Enterprise";
  description: string;
  price_monthly: number;
};

export default function BundlesPage() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [status, setStatus] = useState("");

  const load = async () => {
    const response = await fetch("/api/superadmin/bundles");
    const json = (await response.json()) as { success: boolean; data?: Bundle[]; error?: string };
    if (!json.success || !json.data) {
      setStatus(json.error ?? "Failed to load bundles");
      return;
    }

    setBundles(json.data);
  };

  useEffect(() => {
    void load();
  }, []);

  const onSave = async (event: FormEvent<HTMLFormElement>, name: Bundle["name"]) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const response = await fetch("/api/superadmin/bundles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: String(form.get("description") ?? ""),
        price_monthly: Number(form.get("price_monthly") ?? 0)
      })
    });

    const json = (await response.json()) as { success: boolean; error?: string };
    setStatus(json.success ? `${name} saved` : json.error ?? "Save failed");
    if (json.success) await load();
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {bundles.map((bundle) => (
        <Card key={bundle.id}>
          <h2 className="text-lg font-bold text-teal-800">{bundle.name}</h2>
          <form className="mt-3 grid gap-2" onSubmit={(event) => void onSave(event, bundle.name)}>
            <textarea name="description" className="rounded border p-2 text-sm" defaultValue={bundle.description} required />
            <input
              name="price_monthly"
              type="number"
              min="0"
              step="0.01"
              defaultValue={bundle.price_monthly}
              className="rounded border p-2 text-sm"
              required
            />
            <Button type="submit">Save Bundle</Button>
          </form>
        </Card>
      ))}
      {status && <p className="md:col-span-3 text-sm text-gray-600">{status}</p>}
    </div>
  );
}
