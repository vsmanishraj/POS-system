import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRoles } from "@/lib/auth/guards";
import { ApiResponse } from "@/types/domain";
import { updateTable } from "@/lib/services/admin-config.service";
import { createRequestContext, fail, fromError, ok } from "@/lib/api-response";

const schema = z.object({
  table_id: z.string().uuid(),
  action: z.enum(["REQUEST_BILL", "MARK_OCCUPIED", "MARK_AVAILABLE", "MARK_RESERVED"])
});

export async function POST(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["RESTAURANT_ADMIN", "MANAGER", "WAITER"]);
  if (!auth.ok) return auth.response;
  const claims = auth.claims;

  if (!claims.restaurant_id) {
    return fail(ctx, "Missing tenant context", 400, "TENANT_MISSING");
  }

  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return fail(ctx, parsed.error.message, 400, "VALIDATION_ERROR");
    }

    const statusMap = {
      REQUEST_BILL: "BILL_REQUESTED",
      MARK_OCCUPIED: "OCCUPIED",
      MARK_AVAILABLE: "AVAILABLE",
      MARK_RESERVED: "RESERVED"
    } as const;

    const table = await updateTable(claims.restaurant_id, parsed.data.table_id, {
      current_status: statusMap[parsed.data.action]
    });

    return ok(ctx, table);
  } catch (error) {
    return fromError(ctx, error, "Failed to apply table action");
  }
}
