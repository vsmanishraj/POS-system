"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type LogItem = {
  id: string;
  restaurant_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
};

type Restaurant = { id: string; name: string; subdomain: string };

export default function LogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantId, setRestaurantId] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (restaurantId) params.set("restaurant_id", restaurantId);
    if (actionFilter) params.set("action", actionFilter);
    if (dateFrom) params.set("date_from", new Date(dateFrom).toISOString());
    if (dateTo) params.set("date_to", new Date(dateTo).toISOString());
    return params.toString();
  }, [restaurantId, actionFilter, dateFrom, dateTo]);

  const load = useCallback(async () => {
    const response = await fetch(`/api/superadmin/logs${queryString ? `?${queryString}` : ""}`);
    const json = (await response.json()) as { success: boolean; data?: LogItem[]; error?: string };
    if (!json.success || !json.data) {
      setStatus(json.error ?? "Failed to load logs");
      return;
    }
    setLogs(json.data);
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

  const csvHref = `/api/superadmin/logs?${queryString ? `${queryString}&` : ""}export=csv`;

  return (
    <Card>
      <h1 className="text-xl font-bold">System Logs</h1>

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
          placeholder="Action contains..."
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
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

      <pre className="mt-4 max-h-[450px] overflow-auto rounded bg-gray-950 p-4 text-xs text-green-200">
        {logs
          .map((log) =>
            `[${new Date(log.created_at).toISOString()}] ${log.action} restaurant=${log.restaurant_id ?? "-"} entity=${log.entity_type}:${log.entity_id ?? "-"}`
          )
          .join("\n")}
      </pre>
      {status && <p className="mt-3 text-sm text-gray-600">{status}</p>}
    </Card>
  );
}
