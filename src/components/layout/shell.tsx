import Link from "next/link";
import { ReactNode } from "react";
import { APP_NAME } from "@/lib/constants";
import { Route } from "next";

const nav = [
  { href: "/auth/login", label: "Login" },
  { href: "/superadmin", label: "Super Admin" },
  { href: "/superadmin/flags", label: "Flags" },
  { href: "/superadmin/monitor", label: "Monitor" },
  { href: "/dashboard/admin", label: "Admin" },
  { href: "/dashboard/pos", label: "POS" },
  { href: "/dashboard/waiter", label: "Waiter" },
  { href: "/dashboard/kitchen", label: "Kitchen" },
  { href: "/dashboard/inventory", label: "Inventory" },
  { href: "/demo", label: "Demo" }
] as const satisfies ReadonlyArray<{ href: Route; label: string }>;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/50 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="text-lg font-extrabold tracking-tight text-teal-900">{APP_NAME}</div>
          <nav className="flex gap-2 overflow-x-auto">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-transparent px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
