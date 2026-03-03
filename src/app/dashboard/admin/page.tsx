import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SalesChart } from "@/components/charts/sales-chart";
import { Route } from "next";

const chartData = [
  { name: "Mon", value: 1200 },
  { name: "Tue", value: 1100 },
  { name: "Wed", value: 1800 },
  { name: "Thu", value: 1700 },
  { name: "Fri", value: 2500 },
  { name: "Sat", value: 2900 },
  { name: "Sun", value: 2200 }
];

const kpis = [
  { label: "Today's Sales", value: "$2,200", sub: "+12% vs last week", colour: "text-green-600" },
  { label: "Open Orders", value: "6", sub: "Across all tables", colour: "text-amber-600" },
  { label: "Active Tables", value: "8 / 12", sub: "4 available", colour: "text-sky-600" },
  { label: "Low Stock Items", value: "3", sub: "Require restock", colour: "text-red-600" }
];

const modules = [
  { href: "/dashboard/admin/menu", icon: "🍕", label: "Menu CRUD" },
  { href: "/dashboard/admin/categories", icon: "📂", label: "Categories" },
  { href: "/dashboard/admin/pricing", icon: "💰", label: "Price Management" },
  { href: "/dashboard/admin/staff", icon: "👥", label: "Staff Management" },
  { href: "/dashboard/admin/reports", icon: "📊", label: "Sales Reports" },
  { href: "/dashboard/admin/tax", icon: "🧾", label: "Tax Configuration" },
  { href: "/dashboard/admin/branding", icon: "🎨", label: "Branding" },
  { href: "/dashboard/admin/ocr", icon: "🤖", label: "AI Menu OCR" },
  { href: "/dashboard/admin/crm", icon: "🤝", label: "CRM Dashboard" },
  { href: "/dashboard/admin/preorders", icon: "📋", label: "Preorders" }
];

export default function AdminDashboard() {
  return (
    <div className="grid gap-4">
      {/* KPI Strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{kpi.label}</p>
            <p className={`mt-1 text-2xl font-black ${kpi.colour}`}>{kpi.value}</p>
            <p className="mt-1 text-xs text-slate-500">{kpi.sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Chart */}
        <Card className="lg:col-span-2 border-slate-200 bg-white shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Restaurant Admin Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Weekly revenue performance across all service channels.</p>
          <div className="mt-4">
            <SalesChart data={chartData} />
          </div>
        </Card>

        {/* Module Grid */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <h2 className="font-semibold text-slate-900">Management Modules</h2>
          <div className="mt-3 grid gap-2">
            {modules.map((m) => (
              <Link
                key={m.href}
                href={m.href as Route}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
              >
                <span>{m.icon}</span>
                <span>{m.label}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
