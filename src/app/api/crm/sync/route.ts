import { NextRequest } from "next/server";
import { requireRoles } from "@/lib/auth/guards";
import { upsertCustomerVisit } from "@/lib/integrations/crm";
import { createRequestContext, fail, fromError, ok, withActorContext } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["RESTAURANT_ADMIN", "MANAGER", "CASHIER", "WAITER"]);
  if (!auth.ok) return auth.response;
  const claims = auth.claims;
  const actorCtx = withActorContext(ctx, { actorUserId: claims.sub, restaurantId: claims.restaurant_id });

  const body = (await req.json()) as {
    restaurant_id: string;
    customer_email: string;
    full_name?: string;
    spend_amount: number;
  };

  if (claims.role !== "SUPER_ADMIN" && claims.restaurant_id !== body.restaurant_id) {
    return fail(actorCtx, "Cross tenant access denied", 403, "CROSS_TENANT");
  }

  try {
    const data = await upsertCustomerVisit({
      restaurantId: body.restaurant_id,
      customerEmail: body.customer_email,
      fullName: body.full_name,
      spendAmount: body.spend_amount
    });

    return ok(actorCtx, data);
  } catch (error) {
    return fromError(actorCtx, error, "CRM sync failed");
  }
}
