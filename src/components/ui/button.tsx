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
        variant === "primary" && "bg-teal-700 text-white hover:bg-teal-800",
        variant === "secondary" && "bg-orange-600 text-white hover:bg-orange-700",
        variant === "ghost" && "bg-white border border-gray-300 hover:bg-gray-50",
        className
      )}
      {...props}
    />
  );
}
