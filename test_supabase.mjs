import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      combo_items!combo_product_id (
        id
      )
    `)
    .limit(1);
    
  if (error) console.error('Error1:', error.message);
  else console.log('Success1:', data);

  const { data: d2, error: e2 } = await supabase
    .from('products')
    .select(`
      id,
      combo_items!combo_items_combo_product_id_fkey (
        id
      )
    `)
    .limit(1);
  if (e2) console.error('Error2:', e2.message);
  else console.log('Success2:', d2);
}
test();
