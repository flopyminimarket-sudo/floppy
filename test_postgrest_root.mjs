async function test() {
  console.log('Testing postgrest root connection with 5s timeout...');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  
  try {
    const res = await fetch('https://yubulntqjikxlzcrrnzd.supabase.co/rest/v1/', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    console.log('Status:', res.status);
    console.log('Response text:', await res.text());
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
