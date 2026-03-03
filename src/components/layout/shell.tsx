"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { APP_NAME } from "@/lib/constants";
import { Route } from "next";

const navSections = [
  {
    label: "Platform",
    items: [
      { href: "/superadmin", label: "Super Admin" },
      { href: "/superadmin/flags", label: "Flags" },
      { href: "/superadmin/monitor", label: "Monitor" }
    ]
  },
  {
    label: "Operations",
    items: [
      { href: "/dashboard/admin", label: "Admin" },
      { href: "/dashboard/pos", label: "POS" },
      { href: "/dashboard/waiter", label: "Waiter" },
      { href: "/dashboard/kitchen", label: "Kitchen" },
      { href: "/dashboard/inventory", label: "Inventory" }
    ]
  }
] as const satisfies ReadonlyArray<{
  label: string;
  items: ReadonlyArray<{ href: Route; label: string }>;
}>;

function NavLink({ href, label, active }: { href: Route; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex min-h-[48px] items-center justify-center rounded-xl px-5 text-sm font-bold transition-all duration-200 ${active
          ? "bg-sky-600 text-white shadow-md shadow-sky-600/20"
          : "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`}
    >
      {label}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="sticky top-0 z-20 border-b border-slate-200/60 bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-6 py-4">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white shadow-md">
              <span className="text-xl font-black">M</span>
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900">
              {APP_NAME}
            </span>
          </Link>
          <div className="flex items-center gap-6 overflow-x-auto pb-1 hide-scrollbar">
            {navSections.map((section, si) => (
              <div key={section.label} className="flex items-center gap-2">
                {si > 0 && <span className="mx-2 h-8 w-px shrink-0 bg-slate-200" />}
                <div className="flex rounded-2xl bg-slate-50 p-1.5 border border-slate-100">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      active={pathname === item.href || pathname.startsWith(item.href + "/")}
                    />
                  ))}
                </div>
              </div>
            ))}
            <span className="mx-2 h-8 w-px shrink-0 bg-slate-200" />
            <Link
              href="/auth/login"
              className="flex min-h-[48px] min-w-[100px] items-center justify-center rounded-xl border-2 border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-6 py-8">{children}</main>
    </div>
  );
}
