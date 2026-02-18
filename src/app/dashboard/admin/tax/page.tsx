"use client";

import { FormEvent, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type TaxConfig = {
  tax_name: string;
  tax_percentage: number;
  service_charge_percentage: number;
};

export default function TaxPage() {
  const [taxName, setTaxName] = useState("Sales Tax");
  const [taxPercentage, setTaxPercentage] = useState("8");
  const [serviceCharge, setServiceCharge] = useState("0");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/admin/tax");
      const json = (await response.json()) as { success: boolean; data?: TaxConfig | null; error?: string };
      if (!json.success) {
        setStatus(json.error ?? "Failed to load tax config");
        return;
      }

      if (json.data) {
        setTaxName(json.data.tax_name);
        setTaxPercentage(String(json.data.tax_percentage));
        setServiceCharge(String(json.data.service_charge_percentage));
      }
    };

    void load();
  }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      tax_name: taxName,
      tax_percentage: Number(taxPercentage),
      service_charge_percentage: Number(serviceCharge)
    };

    const response = await fetch("/api/admin/tax", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const json = (await response.json()) as { success: boolean; error?: string };
    setStatus(json.success ? "Tax configuration saved" : json.error ?? "Save failed");
  };

  return (
    <Card>
      <h1 className="text-xl font-bold">Tax Configuration</h1>
      <form className="mt-4 grid gap-3 md:grid-cols-3" onSubmit={onSubmit}>
        <input className="rounded border p-2" value={taxName} onChange={(e) => setTaxName(e.target.value)} required />
        <input
          className="rounded border p-2"
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={taxPercentage}
          onChange={(e) => setTaxPercentage(e.target.value)}
          required
        />
        <input
          className="rounded border p-2"
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={serviceCharge}
          onChange={(e) => setServiceCharge(e.target.value)}
          required
        />
        <Button className="md:col-span-3" type="submit">
          Save Tax Settings
        </Button>
      </form>
      {status && <p className="mt-3 text-sm text-gray-600">{status}</p>}
    </Card>
  );
}
