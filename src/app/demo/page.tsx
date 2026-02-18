"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";

const roles = ["SUPER_ADMIN", "RESTAURANT_ADMIN", "CASHIER", "WAITER", "KITCHEN", "INVENTORY"] as const;

export default function DemoPage() {
  const [role, setRole] = useState<(typeof roles)[number]>("RESTAURANT_ADMIN");

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <h1 className="text-xl font-bold">Demo Mode</h1>
        <p className="mt-2 text-sm text-gray-600">All features enabled, role switching available, and no persistence to the database.</p>
        <select className="mt-4 rounded border p-2" value={role} onChange={(e) => setRole(e.target.value as (typeof roles)[number])}>
          {roles.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </Card>
      <Card>
        <h2 className="font-semibold">Sample Data Snapshot</h2>
        <pre className="mt-3 rounded bg-gray-900 p-4 text-xs text-green-200">
{JSON.stringify(
  {
    role,
    openOrders: 6,
    tablesOccupied: 8,
    lowStockItems: 3,
    todaysSales: 4820.5
  },
  null,
  2
)}
        </pre>
      </Card>
    </div>
  );
}
