import { supabaseAdmin } from "@/lib/supabase/admin";

export async function listMenuItems(restaurantId: string) {
  const { data, error } = await supabaseAdmin
    .from("menu_items")
    .select("id,name,description,price,is_available,menu_categories(name)")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function setMenuItemAvailability(restaurantId: string, itemId: string, isAvailable: boolean) {
  const { error } = await supabaseAdmin
    .from("menu_items")
    .update({ is_available: isAvailable })
    .eq("restaurant_id", restaurantId)
    .eq("id", itemId);

  if (error) throw error;
}

export async function createMenuItem(input: {
  restaurantId: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  isAvailable?: boolean;
}) {
  const { data, error } = await supabaseAdmin
    .from("menu_items")
    .insert({
      restaurant_id: input.restaurantId,
      category_id: input.categoryId,
      name: input.name,
      description: input.description ?? null,
      price: input.price,
      is_available: input.isAvailable ?? true
    })
    .select("id,name,price,is_available")
    .single();

  if (error) throw error;
  return data;
}
