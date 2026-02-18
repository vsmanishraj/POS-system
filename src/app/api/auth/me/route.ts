import { NextRequest } from "next/server";
import { getServerClaims } from "@/lib/auth/session";
import { createRequestContext, fail, ok } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const ctx = createRequestContext(req);
  const claims = await getServerClaims();

  if (!claims) {
    return fail(ctx, "Unauthorized", 401, "UNAUTHORIZED");
  }

  return ok(ctx, claims);
}
