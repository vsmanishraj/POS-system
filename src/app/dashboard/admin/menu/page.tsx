"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Category = { id: string; name: string; sort_order: number };

type MenuItem = {
  id: string;
  category_id?: string;
  name: string;
  description: string | null;
  price: number;
  is_available: boolean;
  menu_categories?: { name?: string | null } | null;
};

type CreateForm = {
  category_id: string;
  name: string;
  description: string;
  price: string;
};

type EditState = {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price: string;
};

const initialCreateForm: CreateForm = {
  category_id: "",
  name: "",
  description: "",
  price: ""
};

export default function AdminMenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [createForm, setCreateForm] = useState<CreateForm>(initialCreateForm);
  const [editItem, setEditItem] = useState<EditState | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);

  const load = async () => {
    setLoading(true);
    const [catRes, itemRes] = await Promise.all([fetch("/api/menu/categories"), fetch("/api/menu")]);

    const catJson = (await catRes.json()) as { success: boolean; data?: Category[]; error?: string };
    const itemJson = (await itemRes.json()) as { success: boolean; data?: MenuItem[]; error?: string };

    if (!catJson.success || !itemJson.success) {
      setStatus(catJson.error ?? itemJson.error ?? "Failed to load menu data");
      setLoading(false);
      return;
    }

    const loadedCategories = (catJson.data ?? []).sort((a, b) => a.sort_order - b.sort_order);
    const loadedItems = itemJson.data ?? [];

    setCategories(loadedCategories);
    setItems(loadedItems);
    setCreateForm((prev) => ({
      ...prev,
      category_id: prev.category_id || loadedCategories[0]?.id || ""
    }));

    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    const price = Number(createForm.price);
    if (!createForm.category_id || !createForm.name.trim() || !Number.isFinite(price) || price <= 0) {
      setStatus("Enter a valid category, name, and price");
      return;
    }

    setStatus("Creating menu item...");
    const response = await fetch("/api/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category_id: createForm.category_id,
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
        price,
        is_available: true
      })
    });

    const json = (await response.json()) as { success: boolean; error?: string };
    if (!json.success) {
      setStatus(json.error ?? "Failed to create item");
      return;
    }

    setCreateForm({ ...initialCreateForm, category_id: createForm.category_id });
    setStatus("Menu item created");
    await load();
  };

  const onToggleAvailability = async (item: MenuItem) => {
    setStatus(`Updating ${item.name}...`);
    const response = await fetch("/api/menu", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, is_available: !item.is_available })
    });

    const json = (await response.json()) as { success: boolean; error?: string };
    setStatus(json.success ? `${item.name} updated` : json.error ?? "Failed to update availability");
    if (json.success) {
      await load();
    }
  };

  const onSaveEdit = async () => {
    if (!editItem) return;

    const price = Number(editItem.price);
    if (!editItem.category_id || !editItem.name.trim() || !Number.isFinite(price) || price <= 0) {
      setStatus("Enter valid values before saving");
      return;
    }

    setStatus(`Saving ${editItem.name}...`);

    const response = await fetch("/api/menu", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editItem.id,
        category_id: editItem.category_id,
        name: editItem.name.trim(),
        description: editItem.description.trim() || null,
        price
      })
    });

    const json = (await response.json()) as { success: boolean; error?: string };
    if (!json.success) {
      setStatus(json.error ?? "Failed to save item");
      return;
    }

    setStatus("Menu item updated");
    setEditItem(null);
    await load();
  };

  const onDelete = async (item: MenuItem) => {
    const confirmed = window.confirm(`Delete ${item.name}? This action cannot be undone.`);
    if (!confirmed) return;

    setStatus(`Deleting ${item.name}...`);
    const response = await fetch("/api/menu", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id })
    });

    const json = (await response.json()) as { success: boolean; error?: string };
    setStatus(json.success ? `${item.name} deleted` : json.error ?? "Failed to delete item");
    if (json.success) {
      await load();
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1 border-sky-300/30 bg-slate-950/55 text-slate-100">
        <h1 className="text-xl font-bold text-sky-200">Menu Management</h1>
        <p className="mt-1 text-sm text-slate-300">Create professional menu catalogs with pricing and availability controls.</p>

        <form className="mt-4 grid gap-3" onSubmit={onCreate}>
          <select
            className="rounded-lg border border-sky-300/40 bg-slate-900/70 p-2 text-sm text-slate-100"
            value={createForm.category_id}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, category_id: e.target.value }))}
            required
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <input
            className="rounded-lg border border-sky-300/40 bg-slate-900/70 p-2 text-sm text-slate-100"
            placeholder="Item name"
            value={createForm.name}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
          <textarea
            className="min-h-[84px] rounded-lg border border-sky-300/40 bg-slate-900/70 p-2 text-sm text-slate-100"
            placeholder="Description"
            value={createForm.description}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
          />
          <input
            className="rounded-lg border border-sky-300/40 bg-slate-900/70 p-2 text-sm text-slate-100"
            placeholder="Price"
            type="number"
            min="0"
            step="0.01"
            value={createForm.price}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, price: e.target.value }))}
            required
          />
          <Button type="submit">Add Menu Item</Button>
        </form>
      </Card>

      <Card className="lg:col-span-2 border-sky-300/30 bg-slate-950/55 text-slate-100">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-sky-200">Current Menu</h2>
          <span className="rounded-full border border-sky-300/40 bg-sky-500/10 px-3 py-1 text-xs text-sky-100">
            {items.length} items
          </span>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-slate-300">Loading menu items...</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-300">
                  <th className="pb-2 pr-2">Item</th>
                  <th className="pb-2 pr-2">Category</th>
                  <th className="pb-2 pr-2">Price</th>
                  <th className="pb-2 pr-2">Status</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-200/20">
                {items.map((item) => {
                  const isEditing = editItem?.id === item.id;
                  return (
                    <tr key={item.id}>
                      <td className="py-3 pr-2 align-top">
                        {isEditing ? (
                          <input
                            className="w-full rounded border border-sky-300/40 bg-slate-900/70 p-2 text-slate-100"
                            value={editItem.name}
                            onChange={(e) => setEditItem((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                          />
                        ) : (
                          <div>
                            <p className="font-semibold text-slate-100">{item.name}</p>
                            <p className="text-xs text-slate-300">{item.description || "No description"}</p>
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-2 align-top">
                        {isEditing ? (
                          <select
                            className="rounded border border-sky-300/40 bg-slate-900/70 p-2 text-slate-100"
                            value={editItem.category_id}
                            onChange={(e) =>
                              setEditItem((prev) => (prev ? { ...prev, category_id: e.target.value } : prev))
                            }
                          >
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-200">
                            {item.menu_categories?.name || (item.category_id ? categoryMap.get(item.category_id) : null) || "-"}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-2 align-top">
                        {isEditing ? (
                          <input
                            className="w-28 rounded border border-sky-300/40 bg-slate-900/70 p-2 text-slate-100"
                            type="number"
                            min="0"
                            step="0.01"
                            value={editItem.price}
                            onChange={(e) => setEditItem((prev) => (prev ? { ...prev, price: e.target.value } : prev))}
                          />
                        ) : (
                          <span>${Number(item.price).toFixed(2)}</span>
                        )}
                      </td>
                      <td className="py-3 pr-2 align-top">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            item.is_available
                              ? "bg-emerald-500/20 text-emerald-200"
                              : "bg-rose-500/20 text-rose-200"
                          }`}
                        >
                          {item.is_available ? "Available" : "Disabled"}
                        </span>
                      </td>
                      <td className="py-3 align-top">
                        <div className="flex flex-wrap gap-2">
                          {isEditing ? (
                            <>
                              <Button type="button" onClick={() => void onSaveEdit()}>
                                Save
                              </Button>
                              <Button variant="ghost" onClick={() => setEditItem(null)}>
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="secondary"
                                onClick={() =>
                                  setEditItem({
                                    id: item.id,
                                    category_id: item.category_id || categories[0]?.id || "",
                                    name: item.name,
                                    description: item.description || "",
                                    price: String(item.price)
                                  })
                                }
                              >
                                Edit
                              </Button>
                              <Button variant="ghost" onClick={() => void onToggleAvailability(item)}>
                                {item.is_available ? "Disable" : "Enable"}
                              </Button>
                              <Button variant="ghost" onClick={() => void onDelete(item)}>
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                        {isEditing && (
                          <textarea
                            className="mt-2 w-full rounded border border-sky-300/40 bg-slate-900/70 p-2 text-slate-100"
                            value={editItem.description}
                            onChange={(e) =>
                              setEditItem((prev) => (prev ? { ...prev, description: e.target.value } : prev))
                            }
                            placeholder="Description"
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {status && <p className="mt-3 text-sm text-sky-100">{status}</p>}
      </Card>
    </div>
  );
}
