"use client";

import { FormEvent, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Category = { id: string; name: string; sort_order: number };

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");

  const load = async () => {
    const response = await fetch("/api/menu/categories");
    const json = (await response.json()) as { success: boolean; data?: Category[]; error?: string };
    if (json.success && json.data) {
      setCategories(json.data);
    } else {
      setStatus(json.error ?? "Failed to load categories");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    setStatus("Saving category...");

    const response = await fetch("/api/menu/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, sort_order: categories.length + 1 })
    });

    const json = (await response.json()) as { success: boolean; error?: string };
    if (!json.success) {
      setStatus(json.error ?? "Create failed");
      return;
    }

    setName("");
    setStatus("Category created");
    await load();
  };

  return (
    <Card>
      <h1 className="text-xl font-bold">Category Management</h1>
      <form className="mt-4 flex gap-2" onSubmit={onCreate}>
        <input
          className="w-full rounded border p-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category name"
          required
        />
        <Button type="submit">Add</Button>
      </form>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
        {categories.map((category) => (
          <div key={category.id} className="rounded border p-3">
            <p className="font-medium">{category.name}</p>
            <p className="text-xs text-gray-500">Sort: {category.sort_order}</p>
          </div>
        ))}
      </div>
      {status && <p className="mt-3 text-sm text-gray-600">{status}</p>}
    </Card>
  );
}
