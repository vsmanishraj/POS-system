import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-sky-300/25 bg-slate-950/55 p-5 text-slate-100 shadow-2xl shadow-slate-950/30 backdrop-blur-xl",
        className
      )}
    >
      {children}
    </section>
  );
}
