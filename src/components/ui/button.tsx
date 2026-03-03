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
        variant === "primary" && "border-sky-600 bg-sky-600 text-white hover:bg-sky-700",
        variant === "secondary" && "border-blue-600 bg-blue-600 text-white hover:bg-blue-700",
        variant === "ghost" && "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
        className
      )}
      {...props}
    />
  );
}
