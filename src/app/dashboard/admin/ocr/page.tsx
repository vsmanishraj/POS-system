"use client";

import { FormEvent, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type OcrItem = {
  name: string;
  category: string;
  price: number;
  confidence: number;
};

type Category = { id: string; name: string; sort_order: number };

export default function OcrPage() {
  const [rawText, setRawText] = useState("Margherita Pizza - 12.50\nIced Latte - 4.50\nCaesar Salad - 8.75");
  const [items, setItems] = useState<OcrItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [status, setStatus] = useState("");

  useEffect(() => {
    const loadCategories = async () => {
      const response = await fetch("/api/menu/categories");
      const json = (await response.json()) as { success: boolean; data?: Category[]; error?: string };
      if (!json.success || !json.data) {
        setStatus(json.error ?? "Failed to load categories");
        return;
      }
      setCategories(json.data);
    };

    void loadCategories();
  }, []);

  const parseOcr = async (event: FormEvent) => {
    event.preventDefault();
    const response = await fetch("/api/admin/ocr/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw_text: rawText })
    });

    const json = (await response.json()) as { success: boolean; data?: { items: OcrItem[] }; error?: string };
    if (!json.success || !json.data) {
      setStatus(json.error ?? "OCR parse failed");
      return;
    }

    setItems(json.data.items);
    const initialSelection: Record<number, boolean> = {};
    json.data.items.forEach((_, index) => {
      initialSelection[index] = true;
    });
    setSelected(initialSelection);
    setStatus(`Parsed ${json.data.items.length} menu items`);
  };

  const ensureCategory = async (categoryName: string): Promise<string | null> => {
    const existing = categories.find((category) => category.name.toLowerCase() === categoryName.toLowerCase());
    if (existing) return existing.id;

    const response = await fetch("/api/menu/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: categoryName, sort_order: categories.length + 1 })
    });

    const json = (await response.json()) as { success: boolean; data?: Category; error?: string };
    if (!json.success || !json.data) {
      setStatus(json.error ?? `Failed to create category ${categoryName}`);
      return null;
    }

    setCategories((prev) => [...prev, json.data as Category]);
    return (json.data as Category).id;
  };

  const importSelected = async () => {
    let created = 0;

    for (let i = 0; i < items.length; i += 1) {
      if (!selected[i]) continue;

      const row = items[i];
      const categoryId = await ensureCategory(row.category);
      if (!categoryId) continue;

      const response = await fetch("/api/menu/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: categoryId,
          name: row.name,
          description: `Imported via OCR (confidence ${Math.round(row.confidence * 100)}%)`,
          price: row.price,
          is_available: true
        })
      });

      const json = (await response.json()) as { success: boolean; error?: string };
      if (!json.success) {
        setStatus(json.error ?? `Failed to import ${row.name}`);
        continue;
      }

      created += 1;
    }

    setStatus(`Imported ${created} menu item(s)`);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <h1 className="text-xl font-bold">AI Menu OCR (Mock)</h1>
        <p className="mt-2 text-sm text-gray-600">
          Paste OCR text extracted from menu images/PDFs and transform into structured menu suggestions.
        </p>

        <form className="mt-4 grid gap-2" onSubmit={parseOcr}>
          <textarea
            className="min-h-44 rounded border p-2 text-sm"
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
          />
          <Button type="submit">Parse Menu Text</Button>
        </form>
      </Card>

      <Card>
        <h2 className="font-semibold">Import Actions</h2>
        <p className="mt-2 text-sm text-gray-600">Select recognized rows and import into Menu CRUD.</p>
        <Button className="mt-3 w-full" onClick={importSelected}>
          Import Selected Items
        </Button>
      </Card>

      <Card className="lg:col-span-3">
        <h2 className="font-semibold">Recognized Items</h2>
        <div className="mt-3 space-y-2 text-sm">
          {items.map((item, idx) => (
            <label key={`${item.name}-${idx}`} className="flex items-center justify-between rounded border p-2">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-gray-600">
                  Category: {item.category} • Price: ${item.price.toFixed(2)} • Confidence: {Math.round(item.confidence * 100)}%
                </p>
              </div>
              <input
                type="checkbox"
                checked={Boolean(selected[idx])}
                onChange={(event) => setSelected((prev) => ({ ...prev, [idx]: event.target.checked }))}
              />
            </label>
          ))}
          {!items.length && <p className="text-gray-500">No OCR results yet.</p>}
        </div>
      </Card>

      {status && <p className="lg:col-span-3 text-sm text-gray-600">{status}</p>}
    </div>
  );
}
