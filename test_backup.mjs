import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

async function run() {
  console.log('URL:', supabaseUrl);
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch schema: ${res.statusText}`);
    }
    const schema = await res.json();
    const tables = Object.keys(schema.definitions || {});
    console.log('Detected tables:', tables);
  } catch (err) {
    console.error('Error fetching schema:', err);
  }
}

run();
