import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  return (
    <button
      className={cn(
        "rounded-lg border px-4 py-2 text-sm font-semibold transition",
        variant === "primary" && "border-sky-300/40 bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:from-sky-400 hover:to-blue-500",
        variant === "secondary" && "border-sky-300/30 bg-sky-500/20 text-sky-100 hover:bg-sky-400/30",
        variant === "ghost" && "border-sky-300/35 bg-slate-900/45 text-slate-100 hover:bg-slate-800/70",
        className
      )}
      {...props}
    />
  );
}
