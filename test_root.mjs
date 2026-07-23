async function test() {
  console.log('Testing root connection with 5s timeout...');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  
  try {
    const res = await fetch('https://yubulntqjikxlzcrrnzd.supabase.co', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    console.log('Status:', res.status);
    console.log('Response text length:', (await res.text()).length);
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
