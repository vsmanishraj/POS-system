"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createRestaurantSchema } from "@/lib/validations/schemas";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type FormData = z.infer<typeof createRestaurantSchema>;

export default function SuperAdminRestaurantsPage() {
  const [status, setStatus] = useState<string>("");
  const [seedStatus, setSeedStatus] = useState<string>("");
  const { register, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(createRestaurantSchema),
    defaultValues: {
      bundleName: "Starter",
      timezone: "America/New_York",
      currency: "USD"
    }
  });

  const onSubmit = async (data: FormData) => {
    setStatus("Provisioning in progress...");
    const response = await fetch("/api/automation/provision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const json = (await response.json()) as { success: boolean; error?: string; data?: { restaurantId: string } };
    setStatus(json.success ? `Provisioned restaurant ${json.data?.restaurantId}` : json.error ?? "Provisioning failed");
  };

  const onSeedDemo = async () => {
    setSeedStatus("Creating demo workspace...");
    const response = await fetch("/api/automation/seed-demo", { method: "POST" });
    const json = (await response.json()) as {
      success: boolean;
      error?: string;
      data?: { restaurantId: string; demoPassword: string; users: Array<{ email: string; role: string }> };
    };

    if (!json.success || !json.data) {
      setSeedStatus(json.error ?? "Demo seed failed");
      return;
    }

    setSeedStatus(
      `Demo ready (${json.data.restaurantId}). Password: ${json.data.demoPassword}. Users: ${json.data.users
        .map((u) => `${u.role}:${u.email}`)
        .join(", ")}`
    );
  };

  return (
    <div className="grid gap-4">
      <Card>
        <h1 className="text-xl font-bold">Create Restaurant</h1>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
          <input className="rounded border p-2" placeholder="Restaurant Name" {...register("name")} />
          <input className="rounded border p-2" placeholder="Subdomain" {...register("subdomain")} />
          <select className="rounded border p-2" {...register("bundleName")}>
            <option value="Starter">Starter</option>
            <option value="Pro">Pro</option>
            <option value="Enterprise">Enterprise</option>
          </select>
          <input className="rounded border p-2" placeholder="Timezone" {...register("timezone")} />
          <input className="rounded border p-2" placeholder="Currency" {...register("currency")} />
          <input className="rounded border p-2" placeholder="Admin Full Name" {...register("adminFullName")} />
          <input className="rounded border p-2 md:col-span-2" placeholder="Admin Email" {...register("adminEmail")} />
          <Button className="md:col-span-2" type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? "Provisioning..." : "Provision Restaurant"}
          </Button>
        </form>
        {status && <p className="mt-3 text-sm text-gray-700">{status}</p>}
      </Card>

      <Card>
        <h2 className="text-lg font-bold">Demo Seed Automation</h2>
        <p className="mt-2 text-sm text-gray-600">Creates Enterprise tenant, role matrix users, and demo credentials.</p>
        <Button className="mt-3" onClick={onSeedDemo}>
          Seed Demo Workspace
        </Button>
        {seedStatus && <p className="mt-3 text-sm text-gray-700">{seedStatus}</p>}
      </Card>
    </div>
  );
}
