import { supabaseAdmin } from "@/lib/supabase/admin";
import { provisionRestaurant } from "@/lib/services/provisioning.service";
import { UserRole } from "@/types/domain";

const DEMO_PASSWORD = "Magroms#2026";

const DEMO_USERS: Array<{ role: UserRole; fullName: string; email: string }> = [
  { role: "RESTAURANT_ADMIN", fullName: "Demo Admin", email: "demo.admin@magroms.app" },
  { role: "MANAGER", fullName: "Demo Manager", email: "demo.manager@magroms.app" },
  { role: "CASHIER", fullName: "Demo Cashier", email: "demo.cashier@magroms.app" },
  { role: "WAITER", fullName: "Demo Waiter", email: "demo.waiter@magroms.app" },
  { role: "KITCHEN", fullName: "Demo Kitchen", email: "demo.kitchen@magroms.app" },
  { role: "INVENTORY", fullName: "Demo Inventory", email: "demo.inventory@magroms.app" }
];

export async function seedDemoWorkspace() {
  const provisioned = await provisionRestaurant({
    name: "Magroms Demo Restaurant",
    subdomain: `demo-${Date.now()}`,
    bundleName: "Enterprise",
    timezone: "America/New_York",
    currency: "USD",
    adminEmail: "demo.owner@magroms.app",
    adminFullName: "Demo Owner",
    featureOverrides: {
      DEMO_MODE: true,
      AI_PREDICTION: true,
      AI_UPSELL: true,
      PREORDER_SYNC: true,
      CRM_SYNC: true,
      INVENTORY_AUTOMATION: true
    }
  });

  const restaurantId = provisioned.restaurantId;
  const createdUsers: Array<{ role: UserRole; email: string; user_id: string }> = [];

  for (const row of DEMO_USERS) {
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: row.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: row.fullName },
      app_metadata: { role: row.role, restaurant_id: restaurantId }
    });

    if (userError) throw userError;

    const { error: staffError } = await supabaseAdmin.from("staff").insert({
      restaurant_id: restaurantId,
      user_id: user.user.id,
      role: row.role,
      full_name: row.fullName,
      email: row.email,
      is_active: true
    });

    if (staffError) throw staffError;
    createdUsers.push({ role: row.role, email: row.email, user_id: user.user.id });
  }

  return {
    restaurantId,
    demoPassword: DEMO_PASSWORD,
    users: createdUsers
  };
}
