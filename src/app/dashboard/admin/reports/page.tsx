"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { toCurrency } from "@/lib/utils";

type Claims = { restaurant_id: string | null };

type Sales = {
  totalSales: number;
  orders: number;
  posSales?: number;
  preorderSales?: number;
};

type BestSeller = {
  item_name: string;
  quantity_sold: number;
};

type PeakHour = {
  hour: number;
  order_count: number;
};

type AnalyticsPayload = {
  daily: Sales;
  weekly: Sales;
  monthly: Sales;
  split: { posPercentage: number; preorderPercentage: number };
  bestSelling: BestSeller[];
  peakHours: PeakHour[];
  inventoryTurnover: { periodDays: number; totalUsage: number; avgStock: number; turnover: number };
  aiPrediction: number | null;
  stockSuggestions: Array<{ name: string; currentStock: number; reorderPoint: number; suggestedQty: number }>;
  upsell: string[];
};

export default function ReportsPage() {
  const [report, setReport] = useState<AnalyticsPayload | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const load = async () => {
      const meResponse = await fetch("/api/auth/me");
      const meJson = (await meResponse.json()) as { success: boolean; data?: Claims; error?: string };
      if (!meJson.success || !meJson.data?.restaurant_id) {
        setStatus(meJson.error ?? "No tenant context");
        return;
      }

      const response = await fetch(`/api/analytics/reports?restaurant_id=${meJson.data.restaurant_id}`);
      const json = (await response.json()) as { success: boolean; data?: AnalyticsPayload; error?: string };
      if (!json.success || !json.data) {
        setStatus(json.error ?? "Failed to load report");
        return;
      }

      setReport(json.data);
    };

    void load();
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <h2 className="font-semibold">Daily</h2>
        <p className="mt-2 text-2xl font-bold">{toCurrency(report?.daily.totalSales ?? 0)}</p>
        <p className="text-xs text-gray-500">Orders: {report?.daily.orders ?? 0}</p>
      </Card>
      <Card>
        <h2 className="font-semibold">Weekly</h2>
        <p className="mt-2 text-2xl font-bold">{toCurrency(report?.weekly.totalSales ?? 0)}</p>
        <p className="text-xs text-gray-500">Orders: {report?.weekly.orders ?? 0}</p>
      </Card>
      <Card>
        <h2 className="font-semibold">Monthly</h2>
        <p className="mt-2 text-2xl font-bold">{toCurrency(report?.monthly.totalSales ?? 0)}</p>
        <p className="text-xs text-gray-500">Orders: {report?.monthly.orders ?? 0}</p>
      </Card>

      <Card>
        <h2 className="font-semibold">Channel Split</h2>
        <p className="mt-2 text-sm text-gray-700">POS: {report?.split.posPercentage ?? 0}%</p>
        <p className="mt-1 text-sm text-gray-700">Preorder: {report?.split.preorderPercentage ?? 0}%</p>
      </Card>

      <Card>
        <h2 className="font-semibold">Inventory Turnover</h2>
        <p className="mt-2 text-sm text-gray-700">Period: {report?.inventoryTurnover.periodDays ?? 0} days</p>
        <p className="mt-1 text-sm text-gray-700">Usage: {Math.round(report?.inventoryTurnover.totalUsage ?? 0)}</p>
        <p className="mt-1 text-sm text-gray-700">Avg Stock: {Math.round(report?.inventoryTurnover.avgStock ?? 0)}</p>
        <p className="mt-1 text-sm text-gray-700">Turnover: {report?.inventoryTurnover.turnover ?? 0}</p>
      </Card>

      <Card>
        <h2 className="font-semibold">Insights</h2>
        <p className="mt-2 text-sm text-gray-700">
          AI Sales Prediction: {report?.aiPrediction ? toCurrency(report.aiPrediction) : "Not enabled"}
        </p>
        <p className="mt-2 text-sm text-gray-700">
          Peak Hour: {report?.peakHours?.[0] ? `${report.peakHours[0].hour}:00` : "-"}
        </p>
      </Card>

      <Card className="md:col-span-2">
        <h2 className="font-semibold">Best Sellers</h2>
        <div className="mt-3 space-y-2 text-sm">
          {(report?.bestSelling ?? []).slice(0, 5).map((row) => (
            <div key={row.item_name} className="flex items-center justify-between rounded border p-2">
              <span>{row.item_name}</span>
              <span>{row.quantity_sold}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">AI Upsell</h2>
        <div className="mt-2 space-y-1 text-sm text-gray-700">
          {(report?.upsell ?? []).map((item) => (
            <p key={item}>• {item}</p>
          ))}
          {!report?.upsell?.length && <p>Not enabled</p>}
        </div>
      </Card>

      <Card className="md:col-span-3">
        <h2 className="font-semibold">Stock Suggestions</h2>
        <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
          {(report?.stockSuggestions ?? []).slice(0, 6).map((item) => (
            <div key={item.name} className="rounded border p-2">
              <p className="font-medium">{item.name}</p>
              <p className="text-gray-600">Current: {item.currentStock}</p>
              <p className="text-gray-600">Reorder Point: {item.reorderPoint}</p>
              <p className="text-gray-600">Suggested Qty: {item.suggestedQty}</p>
            </div>
          ))}
          {!report?.stockSuggestions?.length && <p className="text-gray-500">Not enabled</p>}
        </div>
      </Card>

      {status && <p className="md:col-span-3 text-sm text-gray-600">{status}</p>}
    </div>
  );
}
