import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRoles } from "@/lib/auth/guards";
import { ApiResponse } from "@/types/domain";
import { redeemLoyalty } from "@/lib/services/customer.service";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { createRequestContext, fail, fromError, ok } from "@/lib/api-response";

const schema = z.object({
  restaurant_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  order_id: z.string().uuid(),
  points: z.number().int().positive()
});

export async function POST(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["RESTAURANT_ADMIN", "MANAGER", "CASHIER"]);
  if (!auth.ok) return auth.response;
  const claims = auth.claims;

  const limit = checkRateLimit({
    key: `loyalty-redeem:${claims.sub}`,
    windowMs: 60_000,
    maxRequests: 30
  });
  if (!limit.allowed) {
    return fail(ctx, "Too many redeem requests", 429, "RATE_LIMITED");
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return fail(ctx, parsed.error.message, 400, "VALIDATION_ERROR");
  }

  if (claims.restaurant_id !== parsed.data.restaurant_id) {
    return fail(ctx, "Cross tenant access denied", 403, "CROSS_TENANT");
  }

  try {
    const data = await redeemLoyalty({
      restaurantId: parsed.data.restaurant_id,
      customerId: parsed.data.customer_id,
      orderId: parsed.data.order_id,
      points: parsed.data.points
    });

    return ok(ctx, data);
  } catch (error) {
    return fromError(ctx, error instanceof Error ? new Error(error.message) : error, "Loyalty redeem failed");
  }
}
