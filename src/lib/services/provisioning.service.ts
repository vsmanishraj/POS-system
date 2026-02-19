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

  const seedCategories = [
    { name: "Starters", sort_order: 1 },
    { name: "Mains", sort_order: 2 },
    { name: "Burgers & Sandwiches", sort_order: 3 },
    { name: "Pizzas", sort_order: 4 },
    { name: "Desserts", sort_order: 5 },
    { name: "Beverages", sort_order: 6 }
  ];

  const { data: categories, error: categoryError } = await supabaseAdmin
    .from("menu_categories")
    .insert(seedCategories.map((category) => ({ restaurant_id: restaurantId, ...category })))
    .select("id,name");

  if (categoryError) throw categoryError;

  const categoryByName = Object.fromEntries((categories ?? []).map((category) => [category.name, category.id]));

  const seedMenu = [
    { category: "Starters", name: "Crispy Calamari", description: "Lemon aioli, sea salt, herbs", price: 11.5 },
    { category: "Starters", name: "Loaded Nachos", description: "Cheese, jalapeno, salsa, sour cream", price: 9.75 },
    { category: "Starters", name: "Tomato Basil Soup", description: "Slow-roasted tomato, basil oil", price: 7.25 },
    { category: "Mains", name: "Grilled Herb Chicken", description: "Mashed potato, sauteed vegetables", price: 18.5 },
    { category: "Mains", name: "Creamy Mushroom Pasta", description: "Parmesan, parsley, garlic toast", price: 15.25 },
    { category: "Mains", name: "Paneer Tikka Bowl", description: "Jeera rice, mint yogurt, pickled onions", price: 14.5 },
    { category: "Mains", name: "Fish & Chips", description: "Beer-battered cod, tartar sauce", price: 17.5 },
    {
      category: "Burgers & Sandwiches",
      name: "Classic Beef Burger",
      description: "Cheddar, lettuce, onion, house sauce",
      price: 13.5
    },
    {
      category: "Burgers & Sandwiches",
      name: "Smoky Chicken Burger",
      description: "Chipotle mayo, slaw, pickles",
      price: 12.95
    },
    {
      category: "Burgers & Sandwiches",
      name: "Veggie Club Sandwich",
      description: "Grilled vegetables, pesto, multigrain",
      price: 10.5
    },
    { category: "Pizzas", name: "Margherita Pizza", description: "Tomato sauce, mozzarella, basil", price: 12.5 },
    { category: "Pizzas", name: "Farmhouse Pizza", description: "Peppers, olives, onion, sweet corn", price: 14.25 },
    { category: "Pizzas", name: "Pepperoni Pizza", description: "Pepperoni, mozzarella, oregano", price: 15.5 },
    { category: "Pizzas", name: "BBQ Chicken Pizza", description: "BBQ glaze, chicken, red onion", price: 16.25 },
    { category: "Desserts", name: "Molten Lava Cake", description: "Warm chocolate center, vanilla scoop", price: 8.5 },
    { category: "Desserts", name: "Classic Tiramisu", description: "Coffee-soaked sponge, mascarpone", price: 8.25 },
    { category: "Desserts", name: "Blueberry Cheesecake", description: "Biscuit crust, berry compote", price: 8.75 },
    { category: "Beverages", name: "Cold Coffee", description: "Espresso, milk, ice cream", price: 5.5 },
    { category: "Beverages", name: "Fresh Lime Soda", description: "Sweet/salted sparkling lime", price: 4.25 },
    { category: "Beverages", name: "Iced Peach Tea", description: "Brewed tea, peach syrup", price: 4.95 },
    { category: "Beverages", name: "Sparkling Water", description: "Chilled mineral water", price: 2.95 }
  ];

  const { error: menuError } = await supabaseAdmin.from("menu_items").insert(
    seedMenu.map((item) => ({
      restaurant_id: restaurantId,
      category_id: categoryByName[item.category],
      name: item.name,
      description: item.description,
      price: item.price,
      is_available: true
    }))
  );

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
