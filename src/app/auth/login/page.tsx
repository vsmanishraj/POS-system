"use client";

import { useState } from "react";
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

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(schema)
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const json = (await response.json()) as { success: boolean; error?: string };
    if (!json.success) {
      setError(json.error ?? "Login failed");
      return;
    }

    window.location.href = "/";
  };

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <h1 className="text-xl font-bold">Sign In</h1>
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
