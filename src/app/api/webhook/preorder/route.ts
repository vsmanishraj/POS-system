import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createRequestContext, fail, fromError, ok } from "@/lib/api-response";

const schema = z.object({
  restaurant_id: z.string().uuid(),
  pickup_at: z.string().datetime(),
  total_amount: z.number().nonnegative(),
  customer: z
    .object({
      full_name: z.string().min(2),
      email: z.string().email(),
      phone: z.string().optional()
    })
    .optional(),
  items: z.array(
    z.object({
      menu_item_id: z.string().uuid(),
      quantity: z.number().int().positive(),
      unit_price: z.number().positive()
    })
  )
});

export async function POST(req: NextRequest) {
  const ctx = createRequestContext(req);
  const secret = process.env.WEBHOOK_PREORDER_SECRET;
  if (!secret) {
    return fail(ctx, "Webhook secret is not configured", 503, "WEBHOOK_NOT_CONFIGURED");
  }

  const inboundSecret = req.headers.get("x-webhook-secret");
  if (inboundSecret !== secret) {
    return fail(ctx, "Invalid webhook secret", 401, "UNAUTHORIZED");
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return fail(ctx, parsed.error.message, 400, "VALIDATION_ERROR");
  }

  try {
    const { restaurant_id, pickup_at, total_amount, customer, items } = parsed.data;

    let customerId: string | null = null;
    if (customer) {
      const { data: customerRow, error: customerError } = await supabaseAdmin
        .from("customers")
        .upsert(
          {
            restaurant_id,
            full_name: customer.full_name,
            email: customer.email,
            phone: customer.phone ?? null,
            visit_count: 1
          },
          { onConflict: "restaurant_id,email" }
        )
        .select("id")
        .single();

      if (customerError) throw customerError;
      customerId = customerRow.id;
    }

    const { data: preorder, error: preorderError } = await supabaseAdmin
      .from("preorders")
      .insert({
        restaurant_id,
        customer_id: customerId,
        pickup_at,
        total_amount,
        status: "PENDING"
      })
      .select("id,status,pickup_at,total_amount")
      .single();

    if (preorderError) throw preorderError;

    if (items.length > 0) {
      const { error: itemsError } = await supabaseAdmin.from("preorder_items").insert(
        items.map((item) => ({
          restaurant_id,
          preorder_id: preorder.id,
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          unit_price: item.unit_price
        }))
      );

      if (itemsError) throw itemsError;
    }

    return ok(ctx, preorder, 201);
  } catch (error) {
    return fromError(ctx, error, "Failed to process preorder webhook");
  }
}
