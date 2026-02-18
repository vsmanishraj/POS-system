import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("rounded-xl border border-gray-200 bg-white p-5 shadow-sm", className)}>{children}</section>;
}
