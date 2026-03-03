import { supabaseAdmin } from "@/lib/supabase/admin";
import { createMenuItem } from "@/lib/services/menu.service";

// Define the multi-cuisine menu structure
const MENU_DATA = [
    {
        category: "Italian",
        items: [
            { name: "Pizza Margherita", price: 14.00, description: "Classic tomato, mozzarella, fresh basil" },
            { name: "Pasta Carbonara", price: 18.50, description: "Spaghetti, guanciale, egg yolk, pecorino" },
            { name: "Tiramisu", price: 9.00, description: "Espresso-soaked ladyfingers, mascarpone cream" },
            { name: "Risotto ai Funghi", price: 21.00, description: "Creamy arborio rice with porcini mushrooms" },
            { name: "Focaccia Bread", price: 6.50, description: "Rosemary and sea salt" }
        ]
    },
    {
        category: "Chinese",
        items: [
            { name: "Kung Pao Chicken", price: 16.50, description: "Spicy stir-fry with peanuts and chili peppers" },
            { name: "Dim Sum Platter", price: 19.00, description: "Assorted dumplings (shrimp, pork, veg)" },
            { name: "Spring Rolls (3pcs)", price: 7.00, description: "Crispy vegetable rolls with sweet chili sauce" },
            { name: "Szechuan Beef", price: 18.00, description: "Tender beef slices in spicy Szechuan sauce" },
            { name: "Yangzhou Fried Rice", price: 14.50, description: "Wok-fried rice with egg, pork, and shrimp" }
        ]
    },
    {
        category: "Indian",
        items: [
            { name: "Butter Chicken", price: 19.50, description: "Tandoori chicken in rich tomato cream sauce" },
            { name: "Garlic Naan", price: 4.50, description: "Leavened flatbread topped with garlic and cilantro" },
            { name: "Paneer Tikka Masala", price: 17.50, description: "Grilled cottage cheese in spiced gravy" },
            { name: "Chicken Biryani", price: 18.00, description: "Aromatic basmati rice layered with spiced chicken" },
            { name: "Mango Lassi", price: 5.50, description: "Sweet yogurt drink with Alphonso mango pulp" }
        ]
    }
];

// Helper to get or create a category
async function getOrCreateCategory(restaurantId: string, categoryName: string) {
    // Check existence
    const { data: existing } = await supabaseAdmin
        .from("menu_categories")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .eq("name", categoryName)
        .single();

    if (existing) return existing.id;

    // Create new
    const { data: created, error } = await supabaseAdmin
        .from("menu_categories")
        .insert({ restaurant_id: restaurantId, name: categoryName })
        .select("id")
        .single();

    if (error) throw error;
    return created.id;
}

export async function seedMenu(restaurantId: string) {
    console.log(`🌱 Seeding menu for restaurant: ${restaurantId}`);

    for (const cuisine of MENU_DATA) {
        console.log(`   Processing category: ${cuisine.category}...`);
        try {
            const categoryId = await getOrCreateCategory(restaurantId, cuisine.category);

            for (const item of cuisine.items) {
                // Check if item exists to avoid dupes (idempotency)
                const { data: existingItem } = await supabaseAdmin
                    .from("menu_items")
                    .select("id")
                    .eq("restaurant_id", restaurantId)
                    .eq("name", item.name)
                    .single();

                if (!existingItem) {
                    await createMenuItem({
                        restaurantId,
                        categoryId,
                        name: item.name,
                        description: item.description,
                        price: item.price,
                        isAvailable: true
                    });
                    console.log(`      + Added: ${item.name}`);
                } else {
                    console.log(`      . Skipped (Exists): ${item.name}`);
                }
            }
        } catch (err) {
            console.error(`❌ Failed to seed ${cuisine.category}:`, err);
        }
    }
    console.log("✅ Menu seeding complete.");
}

// Allow standalone execution if restaurant ID is passed via args
const args = process.argv.slice(2);
const restaurantIdArg = args[0];

if (restaurantIdArg) {
    seedMenu(restaurantIdArg)
        .then(() => process.exit(0))
        .catch((e) => {
            console.error(e);
            process.exit(1);
        });
} else {
    console.log("ℹ️ Usage: npx tsx src/scripts/seed-menu.ts <restaurant_id>");
    console.log("   (Or import seedMenu function directly)");
}
