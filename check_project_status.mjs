import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.SUPABASE_ACCESS_TOKEN;

async function check() {
  console.log('Using token:', token ? `${token.substring(0, 10)}...` : 'undefined');
  try {
    const res = await fetch('https://api.supabase.com/v1/projects', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
    }
    const projects = await res.json();
    console.log('Projects details:', JSON.stringify(projects, null, 2));
  } catch (err) {
    console.error('Error listing projects:', err);
  }
}

check();
