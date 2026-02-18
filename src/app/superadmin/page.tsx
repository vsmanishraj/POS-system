import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function SuperAdminPage() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage restaurant onboarding, bundle assignment, feature toggles, automation provisioning, deployments, and logs.
        </p>
      </Card>
      <Card>
        <h2 className="font-semibold">Admin Modules</h2>
        <div className="mt-3 grid gap-2 text-sm">
          <Link href="/superadmin/restaurants" className="rounded border p-2 hover:bg-gray-50">
            Restaurants
          </Link>
          <Link href="/superadmin/bundles" className="rounded border p-2 hover:bg-gray-50">
            Feature Bundles
          </Link>
          <Link href="/superadmin/flags" className="rounded border p-2 hover:bg-gray-50">
            Feature Flags
          </Link>
          <Link href="/superadmin/deployments" className="rounded border p-2 hover:bg-gray-50">
            Deployments
          </Link>
          <Link href="/superadmin/logs" className="rounded border p-2 hover:bg-gray-50">
            Audit Logs
          </Link>
          <Link href="/superadmin/monitor" className="rounded border p-2 hover:bg-gray-50">
            Monitoring
          </Link>
        </div>
      </Card>
    </div>
  );
}
