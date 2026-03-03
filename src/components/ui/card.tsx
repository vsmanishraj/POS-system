import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm",
        className
      )}
    >
      {children}
    </section>
  );
}
