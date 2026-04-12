import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_stock (
        branch_id,
        quantity,
        price,
        offer_price
      ),
      combo_items!combo_product_id (
        id,
        combo_product_id,
        component_product_id,
        quantity
      )
    `)
    .limit(1);
    
  if (error) console.error('Error:', error.message);
  else console.log('Success:', data);
}
test();
