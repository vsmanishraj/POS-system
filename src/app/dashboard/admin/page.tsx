import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SalesChart } from "@/components/charts/sales-chart";

const chartData = [
  { name: "Mon", value: 1200 },
  { name: "Tue", value: 1100 },
  { name: "Wed", value: 1800 },
  { name: "Thu", value: 1700 },
  { name: "Fri", value: 2500 },
  { name: "Sat", value: 2900 },
  { name: "Sun", value: 2200 }
];

export default function AdminDashboard() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <h1 className="text-xl font-bold">Restaurant Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">Daily/Weekly/Monthly sales performance and module controls.</p>
        <div className="mt-4">
          <SalesChart data={chartData} />
        </div>
      </Card>
      <Card>
        <h2 className="font-semibold">Management Modules</h2>
        <div className="mt-3 grid gap-2 text-sm">
          <Link href="/dashboard/admin/menu" className="rounded border p-2 hover:bg-gray-50">Menu CRUD</Link>
          <Link href="/dashboard/admin/categories" className="rounded border p-2 hover:bg-gray-50">Categories</Link>
          <Link href="/dashboard/admin/pricing" className="rounded border p-2 hover:bg-gray-50">Price Management</Link>
          <Link href="/dashboard/admin/staff" className="rounded border p-2 hover:bg-gray-50">Staff Management</Link>
          <Link href="/dashboard/admin/reports" className="rounded border p-2 hover:bg-gray-50">Sales Reports</Link>
          <Link href="/dashboard/admin/tax" className="rounded border p-2 hover:bg-gray-50">Tax Configuration</Link>
          <Link href="/dashboard/admin/branding" className="rounded border p-2 hover:bg-gray-50">Branding</Link>
          <Link href="/dashboard/admin/ocr" className="rounded border p-2 hover:bg-gray-50">AI Menu OCR</Link>
          <Link href="/dashboard/admin/crm" className="rounded border p-2 hover:bg-gray-50">CRM Dashboard</Link>
          <Link href="/dashboard/admin/preorders" className="rounded border p-2 hover:bg-gray-50">Preorders</Link>
        </div>
      </Card>
    </div>
  );
}
