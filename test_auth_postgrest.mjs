import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

async function testWithKeyOnly() {
  console.log('Testing branches with apikey header only...');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/branches?limit=1`, {
      headers: {
        'apikey': supabaseKey
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    console.log('Key only - Status:', res.status);
    console.log('Key only - Response:', await res.text());
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('Key only - Error:', err.message || err);
  }
}

async function testWithBoth() {
  console.log('Testing branches with both headers...');
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
    console.log('Both - Status:', res.status);
    console.log('Both - Response:', await res.text());
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('Both - Error:', err.message || err);
  }
}

async function run() {
  await testWithKeyOnly();
  await testWithBoth();
}

run();
