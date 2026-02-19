import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("rounded-xl border border-blue-100/90 bg-white/90 p-5 shadow-lg shadow-slate-900/10 backdrop-blur", className)}>{children}</section>;
}
