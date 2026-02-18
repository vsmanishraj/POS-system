import { NextRequest } from "next/server";
import { printDocument } from "@/lib/integrations/printer";
import { requireRoles } from "@/lib/auth/guards";
import { createRequestContext, fail, fromError, ok, withActorContext } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["RESTAURANT_ADMIN", "MANAGER", "CASHIER", "KITCHEN"]);
  if (!auth.ok) return auth.response;
  const claims = auth.claims;
  const actorCtx = withActorContext(ctx, { actorUserId: claims.sub, restaurantId: claims.restaurant_id });

  const body = (await req.json()) as {
    restaurant_id: string;
    printer_type: "USB" | "BLUETOOTH" | "NETWORK";
    document_type: "KOT" | "RECEIPT" | "PICKUP_LABEL";
    payload: Record<string, unknown>;
  };

  if (claims.restaurant_id && claims.restaurant_id !== body.restaurant_id) {
    return fail(actorCtx, "Cross tenant access denied", 403, "CROSS_TENANT");
  }

  try {
    const data = await printDocument({
      restaurantId: body.restaurant_id,
      printerType: body.printer_type,
      documentType: body.document_type,
      payload: body.payload
    });

    return ok(actorCtx, data);
  } catch (error) {
    return fromError(actorCtx, error, "Printer integration failed");
  }
}
