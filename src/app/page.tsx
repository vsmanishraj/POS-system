import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Route } from "next";

const roles = [
  { href: "/superadmin", label: "Super Admin", icon: "⚙️", desc: "Platform-wide management, provisioning & monitoring" },
  { href: "/dashboard/admin", label: "Restaurant Admin", icon: "🏪", desc: "Sales analytics, menu, staff, branding & reports" },
  { href: "/dashboard/pos", label: "POS Terminal", icon: "🖥️", desc: "Order creation, payment, loyalty & bill management" },
  { href: "/dashboard/waiter", label: "Waiter Interface", icon: "🍽️", desc: "Table management, order-taking & bill requests" },
  { href: "/dashboard/kitchen", label: "Kitchen Display", icon: "👨‍🍳", desc: "Live order queue with priority & timer tracking" },
  { href: "/dashboard/inventory", label: "Inventory", icon: "📦", desc: "Stock levels, restock requests, alerts & wastage" }
];

const features = [
  { icon: "🏢", title: "Multi-Tenant", desc: "Full tenant isolation with Supabase RLS" },
  { icon: "🔒", title: "Role-Based Auth", desc: "JWT claims, middleware guards & MFA" },
  { icon: "⚡", title: "Realtime", desc: "Live order & inventory updates via Supabase" },
  { icon: "🤖", title: "AI Features", desc: "Menu OCR, demand predictions & analytics" },
  { icon: "🔗", title: "Integrations", desc: "CRM, preorder sync, printer & email" },
  { icon: "📊", title: "Observability", desc: "Structured logs, metrics & Slack alerts" }
];

export default function HomePage() {
  return (
    <div className="grid gap-6">
      {/* Hero */}
      <Card className="border-sky-100 bg-white shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-sky-600">Magroms</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-500">
              Production-ready multi-tenant restaurant platform — role-based operations, real-time automation,
              CRM sync, preorder integration, inventory intelligence, and live observability.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link href="/auth/login">
              <Button>Sign In</Button>
            </Link>
            <Link href="/dashboard/admin">
              <Button variant="ghost">View Dashboard</Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Role Access Grid */}
      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-sky-600/80">Module Access</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <Link key={role.href} href={role.href as Route}>
              <div className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 transition hover:border-sky-300 hover:bg-sky-50 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{role.icon}</span>
                  <span className="font-semibold text-slate-900 group-hover:text-sky-700">{role.label}</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">{role.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Feature Highlights */}
      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-sky-600/80">Platform Features</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <span className="text-2xl">{f.icon}</span>
              <div>
                <p className="font-semibold text-slate-900">{f.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
