import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

async function test() {
  console.log('Fetching branches...');
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/branches?limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    console.log('Status:', res.status);
    console.log('Text:', await res.text());
  } catch (err) {
    console.error('Error fetching branches:', err);
  }
}

test();
