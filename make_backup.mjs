import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not found in env.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

const tables = [
  'branches',
  'users',
  'suppliers',
  'categories',
  'products',
  'product_stock',
  'sales',
  'sale_items',
  'inventory_movements',
  'combo_items',
  'promotions',
  'company_settings'
];

async function backup() {
  console.log('Starting Supabase database backup...');
  console.log(`Connecting to URL: ${supabaseUrl}`);
  
  const backupData = {
    timestamp: new Date().toISOString(),
    projectUrl: supabaseUrl,
    tables: {}
  };
  
  for (const table of tables) {
    console.log(`Fetching data from table: ${table}...`);
    try {
      let allRows = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .range(page * pageSize, (page + 1) * pageSize - 1);
          
        if (error) {
          throw error;
        }
        
        allRows.push(...data);
        console.log(`  - Page ${page + 1}: Fetched ${data.length} rows (total: ${allRows.length})`);
        
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      }
      
      backupData.tables[table] = allRows;
      console.log(`Successfully backed up ${allRows.length} rows from table '${table}'.`);
    } catch (error) {
      console.error(`Error backing up table '${table}':`, error.message);
      backupData.tables[table] = { error: error.message };
    }
  }
  
  const dateStr = new Date().toISOString().split('T')[0] + '_' + new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
  const fileName = `supabase_backup_${dateStr}.json`;
  const filePath = path.resolve(fileName);
  
  fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf-8');
  console.log(`\nBackup complete! File saved as: ${filePath}`);
  console.log(`Total tables backed up: ${Object.keys(backupData.tables).length}`);
}

backup();
