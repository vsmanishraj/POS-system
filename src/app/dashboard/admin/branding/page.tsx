"use client";

import { FormEvent, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Branding = {
  brand_name?: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  invoice_footer?: string;
};

export default function BrandingPage() {
  const [brandName, setBrandName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0f766e");
  const [secondaryColor, setSecondaryColor] = useState("#ea580c");
  const [invoiceFooter, setInvoiceFooter] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/admin/branding");
      const json = (await response.json()) as { success: boolean; data?: Branding | null; error?: string };
      if (!json.success) {
        setStatus(json.error ?? "Failed to load branding settings");
        return;
      }

      if (json.data) {
        setBrandName(json.data.brand_name ?? "");
        setLogoUrl(json.data.logo_url ?? "");
        setPrimaryColor(json.data.primary_color);
        setSecondaryColor(json.data.secondary_color);
        setInvoiceFooter(json.data.invoice_footer ?? "");
      }
    };

    void load();
  }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const response = await fetch("/api/admin/branding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brand_name: brandName || undefined,
        logo_url: logoUrl || undefined,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        invoice_footer: invoiceFooter || undefined
      })
    });

    const json = (await response.json()) as { success: boolean; error?: string };
    setStatus(json.success ? "Branding saved" : json.error ?? "Failed to save branding");
  };

  return (
    <Card>
      <h1 className="text-xl font-bold">Branding Settings</h1>
      <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
        <input
          className="rounded border p-2"
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
          placeholder="Brand name"
        />
        <input
          className="rounded border p-2"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="Logo URL"
        />
        <input className="h-11 rounded border p-1" type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
        <input className="h-11 rounded border p-1" type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} />
        <textarea
          className="rounded border p-2 md:col-span-2"
          value={invoiceFooter}
          onChange={(e) => setInvoiceFooter(e.target.value)}
          placeholder="Invoice footer"
        />
        <Button className="md:col-span-2" type="submit">
          Save Branding
        </Button>
      </form>
      {status && <p className="mt-3 text-sm text-gray-600">{status}</p>}
    </Card>
  );
}
