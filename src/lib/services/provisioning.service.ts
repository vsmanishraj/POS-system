import { BUNDLE_FEATURES } from "@/lib/constants";
import { logAudit } from "@/lib/services/audit.service";
import { sendWelcomeEmail } from "@/lib/integrations/email";
import { configureSubdomain } from "@/lib/integrations/subdomain";
import { RestaurantProvisionPayload } from "@/types/domain";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function provisionRestaurant(input: RestaurantProvisionPayload) {
  const { data: bundle, error: bundleError } = await supabaseAdmin
    .from("feature_bundles")
    .select("id,name")
    .eq("name", input.bundleName)
    .single();

  if (bundleError) throw bundleError;

  const { data: restaurant, error: restaurantError } = await supabaseAdmin
    .from("restaurants")
    .insert({
      name: input.name,
      subdomain: input.subdomain,
      bundle_id: bundle.id,
      timezone: input.timezone,
      currency: input.currency,
      status: "PENDING_SETUP"
    })
    .select("id,name,subdomain")
    .single();

  if (restaurantError) throw restaurantError;

  const featureRows = BUNDLE_FEATURES[input.bundleName].map((feature) => ({
    restaurant_id: restaurant.id,
    feature_name: feature,
    is_enabled: true,
    source: "BUNDLE"
  }));

  if (featureRows.length) {
    const { error } = await supabaseAdmin.from("feature_flags").insert(featureRows);
    if (error) throw error;
  }

  if (input.featureOverrides && Object.keys(input.featureOverrides).length > 0) {
    const overrides = Object.entries(input.featureOverrides).map(([featureName, isEnabled]) => ({
      restaurant_id: restaurant.id,
      feature_name: featureName,
      is_enabled: isEnabled,
      source: "OVERRIDE"
    }));

    const { error: overrideError } = await supabaseAdmin
      .from("feature_flags")
      .upsert(overrides, { onConflict: "restaurant_id,feature_name" });

    if (overrideError) throw overrideError;
  }

  const { data: adminUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
    email: input.adminEmail,
    email_confirm: true,
    user_metadata: { full_name: input.adminFullName },
    app_metadata: {
      role: "RESTAURANT_ADMIN",
      restaurant_id: restaurant.id
    }
  });

  if (userError) throw userError;

  const { error: staffError } = await supabaseAdmin.from("staff").insert({
    restaurant_id: restaurant.id,
    user_id: adminUser.user.id,
    role: "RESTAURANT_ADMIN",
    full_name: input.adminFullName,
    email: input.adminEmail,
    is_active: true
  });

  if (staffError) throw staffError;

  await seedRestaurantData(restaurant.id);
  const domainResult = await configureSubdomain({ subdomain: input.subdomain, restaurantId: restaurant.id });
  const emailResult = await sendWelcomeEmail({
    restaurantName: restaurant.name,
    adminEmail: input.adminEmail,
    subdomain: input.subdomain
  });

  await supabaseAdmin.from("deployments").insert({
    restaurant_id: restaurant.id,
    provider: "Vercel",
    environment: "production",
    status: "READY",
    metadata: { domain: domainResult.host, ssl: domainResult.ssl }
  });

  await supabaseAdmin
    .from("restaurants")
    .update({ status: "ACTIVE" })
    .eq("id", restaurant.id);

  await logAudit({
    restaurantId: restaurant.id,
    actorUserId: adminUser.user.id,
    action: "RESTAURANT_PROVISIONED",
    entityType: "restaurants",
    entityId: restaurant.id,
    metadata: { bundle: input.bundleName }
  });

  return {
    restaurantId: restaurant.id,
    adminUserId: adminUser.user.id,
    domain: domainResult,
    email: emailResult
  };
}

async function seedRestaurantData(restaurantId: string) {
  const { error: tablesError } = await supabaseAdmin.from("tables").insert(
    Array.from({ length: 12 }).map((_, idx) => ({
      restaurant_id: restaurantId,
      name: `T${idx + 1}`,
      capacity: idx < 4 ? 2 : idx < 8 ? 4 : 6,
      zone: idx < 6 ? "MAIN" : "PATIO"
    }))
  );

  if (tablesError) throw tablesError;

  const { data: category, error: categoryError } = await supabaseAdmin
    .from("menu_categories")
    .insert({ restaurant_id: restaurantId, name: "Popular", sort_order: 1 })
    .select("id")
    .single();

  if (categoryError) throw categoryError;

  const { error: menuError } = await supabaseAdmin.from("menu_items").insert([
    {
      restaurant_id: restaurantId,
      category_id: category.id,
      name: "Margherita Pizza",
      description: "Classic tomato, mozzarella, basil",
      price: 12.5,
      is_available: true
    },
    {
      restaurant_id: restaurantId,
      category_id: category.id,
      name: "Caesar Salad",
      description: "Romaine, croutons, parmesan",
      price: 8.75,
      is_available: true
    }
  ]);

  if (menuError) throw menuError;

  const { data: invCategory, error: invCategoryError } = await supabaseAdmin
    .from("inventory_categories")
    .insert({ restaurant_id: restaurantId, name: "Produce" })
    .select("id")
    .single();

  if (invCategoryError) throw invCategoryError;

  const { error: invError } = await supabaseAdmin.from("inventory_items").insert([
    {
      restaurant_id: restaurantId,
      category_id: invCategory.id,
      name: "Tomatoes",
      unit: "kg",
      current_stock: 15,
      min_stock: 5
    },
    {
      restaurant_id: restaurantId,
      category_id: invCategory.id,
      name: "Mozzarella",
      unit: "kg",
      current_stock: 10,
      min_stock: 3
    }
  ]);

  if (invError) throw invError;
}
