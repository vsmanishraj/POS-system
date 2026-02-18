import { FeatureName } from "@/types/domain";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function hasFeature(restaurantId: string, featureName: FeatureName): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("feature_flags")
    .select("is_enabled")
    .eq("restaurant_id", restaurantId)
    .eq("feature_name", featureName)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.is_enabled ?? false;
}

export async function setFeatureOverride(
  restaurantId: string,
  featureName: string,
  isEnabled: boolean
): Promise<void> {
  const { error } = await supabaseAdmin.from("feature_flags").upsert(
    {
      restaurant_id: restaurantId,
      feature_name: featureName,
      is_enabled: isEnabled,
      source: "OVERRIDE"
    },
    { onConflict: "restaurant_id,feature_name" }
  );

  if (error) {
    throw error;
  }
}
