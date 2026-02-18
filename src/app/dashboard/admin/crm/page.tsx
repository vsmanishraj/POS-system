"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { toCurrency } from "@/lib/utils";

type Summary = {
  customerCount: number;
  totalVisits: number;
  totalSpend: number;
  totalLoyaltyOutstanding: number;
};

type Customer = {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  visit_count: number;
  loyalty_balance: number;
  total_spend: number;
};

type LoyaltyTxn = {
  id: string;
  points: number;
  transaction_type: string;
  source: string;
  created_at: string;
  customers?: { full_name?: string | null; email?: string | null } | null;
};

type Dashboard = {
  summary: Summary;
  topCustomers: Customer[];
  loyaltyTransactions: LoyaltyTxn[];
};

export default function CrmPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/crm/dashboard");
      const json = (await response.json()) as { success: boolean; data?: Dashboard; error?: string };
      if (!json.success || !json.data) {
        setStatus(json.error ?? "Failed to load CRM dashboard");
        return;
      }
      setData(json.data);
    };

    void load();
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <h2 className="text-sm font-semibold">Customers</h2>
        <p className="mt-2 text-2xl font-bold">{data?.summary.customerCount ?? 0}</p>
      </Card>
      <Card>
        <h2 className="text-sm font-semibold">Visits</h2>
        <p className="mt-2 text-2xl font-bold">{data?.summary.totalVisits ?? 0}</p>
      </Card>
      <Card>
        <h2 className="text-sm font-semibold">Total Spend</h2>
        <p className="mt-2 text-2xl font-bold">{toCurrency(data?.summary.totalSpend ?? 0)}</p>
      </Card>
      <Card>
        <h2 className="text-sm font-semibold">Loyalty Outstanding</h2>
        <p className="mt-2 text-2xl font-bold">{data?.summary.totalLoyaltyOutstanding ?? 0}</p>
      </Card>

      <Card className="md:col-span-2">
        <h2 className="font-semibold">Top Customers</h2>
        <div className="mt-3 space-y-2 text-sm">
          {(data?.topCustomers ?? []).map((customer) => (
            <div key={customer.id} className="rounded border p-2">
              <p className="font-medium">{customer.full_name}</p>
              <p className="text-gray-600">{customer.email}</p>
              <p className="text-gray-600">
                Visits: {customer.visit_count} • Loyalty: {customer.loyalty_balance}
              </p>
              <p className="text-gray-600">Spend: {toCurrency(Number(customer.total_spend))}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="md:col-span-2">
        <h2 className="font-semibold">Loyalty Ledger</h2>
        <div className="mt-3 space-y-2 text-sm">
          {(data?.loyaltyTransactions ?? []).map((txn) => (
            <div key={txn.id} className="rounded border p-2">
              <p className="font-medium">{txn.customers?.full_name ?? txn.customers?.email ?? "Unknown"}</p>
              <p className="text-gray-600">
                {txn.transaction_type} • {txn.points} pts • {txn.source}
              </p>
              <p className="text-xs text-gray-500">{new Date(txn.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </Card>

      {status && <p className="md:col-span-4 text-sm text-gray-600">{status}</p>}
    </div>
  );
}
