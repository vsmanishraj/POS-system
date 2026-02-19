"use client";

import { useState } from "react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

type FormData = z.infer<typeof schema>;

function defaultRouteForRole(role: string) {
  switch (role) {
    case "SUPER_ADMIN":
      return "/superadmin";
    case "RESTAURANT_ADMIN":
    case "MANAGER":
      return "/dashboard/admin";
    case "CASHIER":
      return "/dashboard/pos";
    case "WAITER":
      return "/dashboard/waiter";
    case "KITCHEN":
      return "/dashboard/kitchen";
    case "INVENTORY":
      return "/dashboard/inventory";
    default:
      return "/demo";
  }
}

export default function LoginPage() {
  const [nextPath, setNextPath] = useState<string | null>(null);
  const [forbiddenReason, setForbiddenReason] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(schema)
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    const safeNext = next && next.startsWith("/") ? next : null;
    setNextPath(safeNext);
    setForbiddenReason(params.get("reason") === "forbidden");
  }, []);

  const onSubmit = async (data: FormData) => {
    setError(null);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const json = (await response.json()) as {
      success: boolean;
      error?: string;
      data?: {
        user?: {
          app_metadata?: {
            role?: string;
          };
        };
      };
    };
    if (!json.success) {
      setError(json.error ?? "Login failed");
      return;
    }

    const role = json.data?.user?.app_metadata?.role ?? "CUSTOMER";
    const destination = role === "CUSTOMER" ? defaultRouteForRole(role) : nextPath ?? defaultRouteForRole(role);

    window.location.href = destination;
  };

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <h1 className="text-xl font-bold">Sign In</h1>
        {forbiddenReason && (
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800">
            Your account does not have access to that module. Sign in with the correct role.
          </p>
        )}
        <form className="mt-4 grid gap-3" onSubmit={handleSubmit(onSubmit)}>
          <input className="rounded-md border p-2" placeholder="Email" {...register("email")} />
          <input className="rounded-md border p-2" placeholder="Password" type="password" {...register("password")} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
