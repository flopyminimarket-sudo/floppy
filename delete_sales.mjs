import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not found in env.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteOldSales() {
  const cutoffDate = '2026-06-23T00:00:00.000Z';
  console.log(`Iniciando eliminación de tickets (tabla 'sales') emitidos antes del 23 de junio de 2026...`);
  console.log(`Fecha límite (exclusiva): ${cutoffDate}`);
  
  try {
    // Primero, hacemos un conteo para saber cuántos se van a borrar
    const { count, error: countError } = await supabase
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .lt('date', cutoffDate);
      
    if (countError) throw countError;
    
    console.log(`Se encontraron ${count} tickets emitidos antes del 23 de junio de 2026.`);
    
    if (count === 0) {
      console.log('No hay tickets antiguos para borrar.');
      return;
    }
    
    console.log('Procediendo a la eliminación...');
    
    // Realizamos la eliminación
    const { data, error } = await supabase
      .from('sales')
      .delete()
      .lt('date', cutoffDate)
      .select('id, date, total');
      
    if (error) throw error;
    
    console.log(`\n¡Eliminación completada con éxito!`);
    console.log(`Se eliminaron ${data.length} registros de la tabla 'sales'.`);
    console.log('Detalle de algunos tickets eliminados:');
    data.slice(0, 10).forEach(sale => {
      console.log(`- ID: ${sale.id} | Fecha: ${sale.date} | Total: ${sale.total}`);
    });
    if (data.length > 10) {
      console.log(`... y ${data.length - 10} tickets más.`);
    }
    
  } catch (err) {
    console.error('Error durante el proceso:', err.message || err);
  }
}

deleteOldSales();
