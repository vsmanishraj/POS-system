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
        "rounded-lg px-4 py-2 text-sm font-semibold transition",
        variant === "primary" && "bg-blue-700 text-white hover:bg-blue-800",
        variant === "secondary" && "bg-sky-500 text-white hover:bg-sky-600",
        variant === "ghost" && "bg-white/85 border border-blue-200 text-blue-900 hover:bg-sky-50",
        className
      )}
      {...props}
    />
  );
}
