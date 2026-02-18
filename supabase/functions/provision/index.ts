import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: bundle, error: bundleError } = await supabase
      .from("feature_bundles")
      .select("id")
      .eq("name", payload.bundleName)
      .single();

    if (bundleError) throw bundleError;

    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .insert({
        name: payload.name,
        subdomain: payload.subdomain,
        bundle_id: bundle.id,
        timezone: payload.timezone,
        currency: payload.currency,
        status: "PENDING_SETUP"
      })
      .select("id,name")
      .single();

    if (restaurantError) throw restaurantError;

    const { data: admin, error: userError } = await supabase.auth.admin.createUser({
      email: payload.adminEmail,
      email_confirm: true,
      user_metadata: { full_name: payload.adminFullName },
      app_metadata: {
        role: "RESTAURANT_ADMIN",
        restaurant_id: restaurant.id
      }
    });

    if (userError) throw userError;

    const { error: staffError } = await supabase.from("staff").insert({
      restaurant_id: restaurant.id,
      user_id: admin.user.id,
      role: "RESTAURANT_ADMIN",
      full_name: payload.adminFullName,
      email: payload.adminEmail,
      is_active: true
    });

    if (staffError) throw staffError;

    return new Response(
      JSON.stringify({
        success: true,
        restaurant_id: restaurant.id,
        admin_user_id: admin.user.id
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
