import { supabaseAdmin } from "@/lib/supabase/admin";

export async function listCategories(restaurantId: string) {
  const { data, error } = await supabaseAdmin
    .from("menu_categories")
    .select("id,name,sort_order,created_at")
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createCategory(restaurantId: string, name: string, sortOrder = 0) {
  const { data, error } = await supabaseAdmin
    .from("menu_categories")
    .insert({ restaurant_id: restaurantId, name, sort_order: sortOrder })
    .select("id,name,sort_order")
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategory(restaurantId: string, categoryId: string, input: { name?: string; sort_order?: number }) {
  const { data, error } = await supabaseAdmin
    .from("menu_categories")
    .update(input)
    .eq("restaurant_id", restaurantId)
    .eq("id", categoryId)
    .select("id,name,sort_order")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCategory(restaurantId: string, categoryId: string) {
  const { error } = await supabaseAdmin
    .from("menu_categories")
    .delete()
    .eq("restaurant_id", restaurantId)
    .eq("id", categoryId);
  if (error) throw error;
}

export async function updateMenuPrice(restaurantId: string, menuItemId: string, price: number) {
  const { data, error } = await supabaseAdmin
    .from("menu_items")
    .update({ price })
    .eq("restaurant_id", restaurantId)
    .eq("id", menuItemId)
    .select("id,name,price")
    .single();
  if (error) throw error;
  return data;
}

export async function getTaxConfiguration(restaurantId: string) {
  const { data, error } = await supabaseAdmin
    .from("tax_configurations")
    .select("id,tax_name,tax_percentage,service_charge_percentage")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertTaxConfiguration(
  restaurantId: string,
  input: { tax_name: string; tax_percentage: number; service_charge_percentage: number }
) {
  const { data, error } = await supabaseAdmin
    .from("tax_configurations")
    .upsert({ restaurant_id: restaurantId, ...input }, { onConflict: "restaurant_id" })
    .select("id,tax_name,tax_percentage,service_charge_percentage")
    .single();
  if (error) throw error;
  return data;
}

export async function getBrandingSettings(restaurantId: string) {
  const { data, error } = await supabaseAdmin
    .from("branding_settings")
    .select("id,brand_name,logo_url,primary_color,secondary_color,invoice_footer")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertBrandingSettings(
  restaurantId: string,
  input: {
    brand_name?: string;
    logo_url?: string;
    primary_color: string;
    secondary_color: string;
    invoice_footer?: string;
  }
) {
  const { data, error } = await supabaseAdmin
    .from("branding_settings")
    .upsert({ restaurant_id: restaurantId, ...input }, { onConflict: "restaurant_id" })
    .select("id,brand_name,logo_url,primary_color,secondary_color,invoice_footer")
    .single();
  if (error) throw error;
  return data;
}

export async function listTables(
  restaurantId: string,
  input?: { current_status?: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "BILL_REQUESTED" | "CLEANING" }
) {
  let query = supabaseAdmin
    .from("tables")
    .select("id,name,capacity,zone,is_active,current_status,assigned_staff_id,staff(full_name,email)")
    .eq("restaurant_id", restaurantId)
    .order("name", { ascending: true });

  if (input?.current_status) {
    query = query.eq("current_status", input.current_status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createTable(restaurantId: string, input: { name: string; capacity: number; zone?: string }) {
  const { data, error } = await supabaseAdmin
    .from("tables")
    .insert({ restaurant_id: restaurantId, ...input, current_status: "AVAILABLE" })
    .select("id,name,capacity,zone,is_active,current_status,assigned_staff_id")
    .single();
  if (error) throw error;
  return data;
}

export async function updateTable(
  restaurantId: string,
  tableId: string,
  input: {
    name?: string;
    capacity?: number;
    zone?: string;
    is_active?: boolean;
    current_status?: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "BILL_REQUESTED" | "CLEANING";
    assigned_staff_id?: string | null;
  }
) {
  const { data, error } = await supabaseAdmin
    .from("tables")
    .update(input)
    .eq("restaurant_id", restaurantId)
    .eq("id", tableId)
    .select("id,name,capacity,zone,is_active,current_status,assigned_staff_id")
    .single();
  if (error) throw error;
  return data;
}
