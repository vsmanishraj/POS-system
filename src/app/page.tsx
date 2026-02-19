import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="border-sky-300/30 bg-slate-950/55">
        <h1 className="text-3xl font-black tracking-tight text-sky-200">Magroms</h1>
        <p className="mt-2 text-sm text-slate-300">
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
      <Card className="border-sky-300/30 bg-slate-950/55">
        <h2 className="font-semibold text-sky-200">Quick Access</h2>
        <p className="mt-1 text-xs text-slate-300">Quick access opens after sign-in and returns to the selected module.</p>
        <div className="mt-3 grid gap-2 text-sm">
          <Link href="/superadmin" className="rounded-xl border border-sky-300/30 bg-slate-900/50 px-3 py-2 font-medium text-slate-100 transition hover:border-sky-300/60 hover:bg-sky-500/15">
            Super Admin Dashboard
          </Link>
          <Link href="/dashboard/admin" className="rounded-xl border border-sky-300/30 bg-slate-900/50 px-3 py-2 font-medium text-slate-100 transition hover:border-sky-300/60 hover:bg-sky-500/15">
            Restaurant Admin Dashboard
          </Link>
          <Link href="/dashboard/pos" className="rounded-xl border border-sky-300/30 bg-slate-900/50 px-3 py-2 font-medium text-slate-100 transition hover:border-sky-300/60 hover:bg-sky-500/15">
            POS Terminal
          </Link>
          <Link href="/dashboard/waiter" className="rounded-xl border border-sky-300/30 bg-slate-900/50 px-3 py-2 font-medium text-slate-100 transition hover:border-sky-300/60 hover:bg-sky-500/15">
            Waiter Interface
          </Link>
          <Link href="/dashboard/kitchen" className="rounded-xl border border-sky-300/30 bg-slate-900/50 px-3 py-2 font-medium text-slate-100 transition hover:border-sky-300/60 hover:bg-sky-500/15">
            Kitchen Display
          </Link>
          <Link href="/dashboard/inventory" className="rounded-xl border border-sky-300/30 bg-slate-900/50 px-3 py-2 font-medium text-slate-100 transition hover:border-sky-300/60 hover:bg-sky-500/15">
            Inventory Dashboard
          </Link>
          <Link href="/demo" className="rounded-xl border border-sky-300/30 bg-slate-900/50 px-3 py-2 font-medium text-slate-100 transition hover:border-sky-300/60 hover:bg-sky-500/15">
            Demo Mode
          </Link>
        </div>
      </Card>
    </div>
  );
}
