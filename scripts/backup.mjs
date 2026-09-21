import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const dbUrl = process.env.DATABASE_URL;

export async function runBackup() {
  if (!dbUrl) {
    throw new Error('DATABASE_URL no está definida en las variables de entorno (.env)');
  }

  const timestamp = new Date().toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
  const backupDir = path.resolve('backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const fileName = `supabase_backup_${timestamp}.sql`;
  const filePath = path.join(backupDir, fileName);

  return new Promise((resolve, reject) => {
    // pg_dump debe estar disponible en la terminal del host VPS/PC
    const cmd = `pg_dump "${dbUrl}" --no-owner --no-privileges -f "${filePath}"`;
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error en pg_dump: ${error.message}`);
        console.error(stderr);
        reject(error);
        return;
      }
      console.log(`Respaldo generado exitosamente: ${filePath}`);
      resolve(filePath);
    });
  });
}

// Invocación directa
if (import.meta.url === `file://${process.argv[1]}`) {
  runBackup().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
