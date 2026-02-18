import { NextRequest } from "next/server";
import { hasFeature } from "@/lib/services/feature-flags.service";
import { FeatureName } from "@/types/domain";
import { createRequestContext, fail, fromError, ok } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const ctx = createRequestContext(req);
  const restaurantId = req.nextUrl.searchParams.get("restaurant_id");
  const featureName = req.nextUrl.searchParams.get("feature_name") as FeatureName | null;

  if (!restaurantId || !featureName) {
    return fail(ctx, "restaurant_id and feature_name required", 400, "VALIDATION_ERROR");
  }

  try {
    const enabled = await hasFeature(restaurantId, featureName);
    return ok(ctx, { enabled });
  } catch (error) {
    return fromError(ctx, error, "Feature evaluation failed");
  }
}
