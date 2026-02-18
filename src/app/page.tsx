import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <h1 className="text-2xl font-bold text-teal-800">Magroms POS System</h1>
        <p className="mt-2 text-sm text-gray-600">
          Production-ready multi-tenant restaurant POS SaaS with Supabase, role-based access, feature bundles,
          provisioning automation, CRM sync, pre-order sync, inventory automation, and AI insights.
        </p>
      </Card>
      <Card>
        <h2 className="font-semibold">Quick Access</h2>
        <div className="mt-3 grid gap-2 text-sm">
          <Link href="/superadmin" className="rounded-md border p-2 hover:bg-gray-50">
            Super Admin Dashboard
          </Link>
          <Link href="/dashboard/admin" className="rounded-md border p-2 hover:bg-gray-50">
            Restaurant Admin Dashboard
          </Link>
          <Link href="/dashboard/pos" className="rounded-md border p-2 hover:bg-gray-50">
            POS Terminal
          </Link>
          <Link href="/demo" className="rounded-md border p-2 hover:bg-gray-50">
            Demo Mode
          </Link>
        </div>
      </Card>
    </div>
  );
}
