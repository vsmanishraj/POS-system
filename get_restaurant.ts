import { supabaseAdmin } from "./src/lib/supabase/admin";

async function run() {
    const { data, error } = await supabaseAdmin.from("restaurants").select("id, name");
    console.log(JSON.stringify({ data, error }, null, 2));
}
run();
