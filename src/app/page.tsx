import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="border-teal-100 bg-white/80 backdrop-blur">
        <h1 className="text-3xl font-black tracking-tight text-teal-900">Magroms</h1>
        <p className="mt-2 text-sm text-gray-600">
          Production-ready multi-tenant restaurant platform with role-based operations, automation, CRM, preorder sync,
          inventory intelligence, and live observability.
        </p>
        <div className="mt-4 flex gap-2">
          <Link href="/auth/login">
            <Button>Sign In</Button>
          </Link>
          <Link href="/demo">
            <Button variant="ghost">Open Demo</Button>
          </Link>
        </div>
      </Card>
      <Card className="border-cyan-100 bg-white/85 backdrop-blur">
        <h2 className="font-semibold">Quick Access</h2>
        <p className="mt-1 text-xs text-slate-500">If a page redirects, sign in with a role-enabled account first.</p>
        <div className="mt-3 grid gap-2 text-sm">
          <Link href="/superadmin" className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-medium transition hover:border-teal-300 hover:bg-teal-50">
            Super Admin Dashboard
          </Link>
          <Link href="/dashboard/admin" className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-medium transition hover:border-teal-300 hover:bg-teal-50">
            Restaurant Admin Dashboard
          </Link>
          <Link href="/dashboard/pos" className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-medium transition hover:border-teal-300 hover:bg-teal-50">
            POS Terminal
          </Link>
          <Link href="/dashboard/waiter" className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-medium transition hover:border-teal-300 hover:bg-teal-50">
            Waiter Interface
          </Link>
          <Link href="/dashboard/kitchen" className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-medium transition hover:border-teal-300 hover:bg-teal-50">
            Kitchen Display
          </Link>
          <Link href="/dashboard/inventory" className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-medium transition hover:border-teal-300 hover:bg-teal-50">
            Inventory Dashboard
          </Link>
          <Link href="/demo" className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-medium transition hover:border-teal-300 hover:bg-teal-50">
            Demo Mode
          </Link>
        </div>
      </Card>
    </div>
  );
}
