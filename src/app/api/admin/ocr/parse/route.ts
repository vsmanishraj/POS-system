import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRoles } from "@/lib/auth/guards";
import { parseMenuText } from "@/lib/mock-ai/menu-ocr";
import { createRequestContext, fail, fromError, ok, withActorContext } from "@/lib/api-response";

const schema = z.object({
  raw_text: z.string().min(5)
});

export async function POST(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["RESTAURANT_ADMIN", "MANAGER"]);
  if (!auth.ok) return auth.response;
  const actorCtx = withActorContext(ctx, { actorUserId: auth.claims.sub, restaurantId: auth.claims.restaurant_id });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return fail(actorCtx, parsed.error.message, 400, "VALIDATION_ERROR");
  }

  try {
    const items = parseMenuText(parsed.data.raw_text);
    return ok(actorCtx, { items, total: items.length });
  } catch (error) {
    return fromError(actorCtx, error, "OCR parsing failed");
  }
}
