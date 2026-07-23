import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

async function test() {
  console.log('Testing connection with 5s timeout...');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/branches?limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    console.log('Status:', res.status);
    console.log('Headers:', [...res.headers.entries()]);
    console.log('Response:', await res.text());
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      console.error('Request timed out after 5s');
    } else {
      console.error('Connection error:', err);
    }
  }
}

test();
