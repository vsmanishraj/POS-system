"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Deployment = {
  id: string;
  restaurant_id: string;
  provider: string;
  environment: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type Restaurant = { id: string; name: string; subdomain: string };

export default function DeploymentsPage() {
  const [rows, setRows] = useState<Deployment[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantId, setRestaurantId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (restaurantId) params.set("restaurant_id", restaurantId);
    if (statusFilter) params.set("status", statusFilter);
    if (dateFrom) params.set("date_from", new Date(dateFrom).toISOString());
    if (dateTo) params.set("date_to", new Date(dateTo).toISOString());
    return params.toString();
  }, [restaurantId, statusFilter, dateFrom, dateTo]);

  const load = useCallback(async () => {
    const response = await fetch(`/api/superadmin/deployments${queryString ? `?${queryString}` : ""}`);
    const json = (await response.json()) as { success: boolean; data?: Deployment[]; error?: string };
    if (!json.success || !json.data) {
      setStatus(json.error ?? "Failed to load deployments");
      return;
    }
    setRows(json.data);
  }, [queryString]);

  useEffect(() => {
    const loadRestaurants = async () => {
      const response = await fetch("/api/restaurants");
      const json = (await response.json()) as { success: boolean; data?: Restaurant[]; error?: string };
      if (json.success && json.data) {
        setRestaurants(json.data);
      }
    };

    void loadRestaurants();
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onApply = async (event: FormEvent) => {
    event.preventDefault();
    await load();
  };

  const csvHref = `/api/superadmin/deployments?${queryString ? `${queryString}&` : ""}export=csv`;

  return (
    <Card>
      <h1 className="text-xl font-bold">Deployment Monitor</h1>

      <form className="mt-4 grid gap-2 md:grid-cols-5" onSubmit={onApply}>
        <select className="rounded border p-2 text-sm" value={restaurantId} onChange={(e) => setRestaurantId(e.target.value)}>
          <option value="">All Restaurants</option>
          {restaurants.map((restaurant) => (
            <option key={restaurant.id} value={restaurant.id}>
              {restaurant.name} ({restaurant.subdomain})
            </option>
          ))}
        </select>
        <input
          className="rounded border p-2 text-sm"
          placeholder="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        />
        <input className="rounded border p-2 text-sm" type="datetime-local" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <input className="rounded border p-2 text-sm" type="datetime-local" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        <div className="flex gap-2">
          <Button type="submit">Apply</Button>
          <a href={csvHref} className="inline-flex items-center rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-gray-50">
            Export CSV
          </a>
        </div>
      </form>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-gray-500">
            <tr>
              <th className="p-2">Restaurant ID</th>
              <th className="p-2">Environment</th>
              <th className="p-2">Provider</th>
              <th className="p-2">Status</th>
              <th className="p-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-2">{item.restaurant_id}</td>
                <td className="p-2">{item.environment}</td>
                <td className="p-2">{item.provider}</td>
                <td className="p-2">{item.status}</td>
                <td className="p-2">{new Date(item.updated_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {status && <p className="mt-3 text-sm text-gray-600">{status}</p>}
    </Card>
  );
}
