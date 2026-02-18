"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Restaurant = {
  id: string;
  name: string;
  subdomain: string;
  status: string;
};

type FeatureFlag = {
  id: string;
  restaurant_id: string;
  feature_name: string;
  is_enabled: boolean;
  source: "BUNDLE" | "OVERRIDE";
  updated_at: string;
};

export default function SuperadminFlagsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [status, setStatus] = useState("");

  const loadRestaurants = useCallback(async () => {
    const response = await fetch("/api/restaurants");
    const json = (await response.json()) as { success: boolean; data?: Restaurant[]; error?: string };

    if (!json.success || !json.data) {
      setStatus(json.error ?? "Failed to load restaurants");
      return;
    }

    const rows = json.data ?? [];
    setRestaurants(rows);
    setSelectedRestaurantId((prev) => prev || rows[0]?.id || "");
  }, []);

  const loadFlags = async (restaurantId: string) => {
    if (!restaurantId) return;
    const response = await fetch(`/api/superadmin/flags?restaurant_id=${restaurantId}`);
    const json = (await response.json()) as { success: boolean; data?: FeatureFlag[]; error?: string };

    if (!json.success || !json.data) {
      setStatus(json.error ?? "Failed to load flags");
      return;
    }

    setFlags(json.data);
  };

  useEffect(() => {
    void loadRestaurants();
  }, [loadRestaurants]);

  useEffect(() => {
    if (selectedRestaurantId) {
      void loadFlags(selectedRestaurantId);
    }
  }, [selectedRestaurantId]);

  const toggleFeature = async (flag: FeatureFlag) => {
    const response = await fetch("/api/superadmin/flags", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurant_id: flag.restaurant_id,
        feature_name: flag.feature_name,
        is_enabled: !flag.is_enabled
      })
    });

    const json = (await response.json()) as { success: boolean; error?: string };
    setStatus(json.success ? `Updated ${flag.feature_name}` : json.error ?? "Update failed");
    if (json.success) {
      await loadFlags(flag.restaurant_id);
    }
  };

  return (
    <Card>
      <h1 className="text-xl font-bold">Feature Flag Control Center</h1>
      <p className="mt-2 text-sm text-gray-600">
        Inspect feature sets by tenant and apply per-restaurant override toggles.
      </p>

      <select
        className="mt-4 rounded border p-2 text-sm"
        value={selectedRestaurantId}
        onChange={(event) => setSelectedRestaurantId(event.target.value)}
      >
        {restaurants.map((restaurant) => (
          <option key={restaurant.id} value={restaurant.id}>
            {restaurant.name} ({restaurant.subdomain})
          </option>
        ))}
      </select>

      <div className="mt-4 grid gap-2 text-sm md:grid-cols-2">
        {flags.map((flag) => (
          <div key={flag.id} className="rounded border p-3">
            <p className="font-medium">{flag.feature_name}</p>
            <p className="text-xs text-gray-500">
              Source: {flag.source} • Updated: {new Date(flag.updated_at).toLocaleString()}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className={flag.is_enabled ? "text-green-700" : "text-gray-500"}>
                {flag.is_enabled ? "Enabled" : "Disabled"}
              </span>
              <Button onClick={() => void toggleFeature(flag)}>{flag.is_enabled ? "Disable" : "Enable"}</Button>
            </div>
          </div>
        ))}
      </div>

      {status && <p className="mt-4 text-sm text-gray-600">{status}</p>}
    </Card>
  );
}
