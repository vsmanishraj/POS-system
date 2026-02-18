import { NextRequest, NextResponse } from "next/server";
import { createRestaurantSchema } from "@/lib/validations/schemas";
import { provisionRestaurant } from "@/lib/services/provisioning.service";
import { requireRoles } from "@/lib/auth/guards";
import { ApiResponse } from "@/types/domain";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { createRequestContext, fail, fromError, ok } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["SUPER_ADMIN"]);
  if (!auth.ok) return auth.response;
  const claims = auth.claims;

  const limit = checkRateLimit({
    key: `provision:${claims.sub}`,
    windowMs: 60_000,
    maxRequests: 10
  });
  if (!limit.allowed) {
    return fail(ctx, "Too many provisioning requests", 429, "RATE_LIMITED");
  }

  try {
    const json = await req.json();
    const parsed = createRestaurantSchema.safeParse(json);

    if (!parsed.success) {
      return fail(ctx, parsed.error.message, 400, "VALIDATION_ERROR");
    }

    const result = await provisionRestaurant(parsed.data);
    return ok(ctx, result);
  } catch (error) {
    return fromError(ctx, error, "Provisioning failed");
  }
}
