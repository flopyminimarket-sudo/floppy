import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const dbUrl = process.env.DATABASE_URL;

export async function runRestore(filePath) {
  if (!dbUrl) {
    throw new Error('DATABASE_URL no está definida en las variables de entorno (.env)');
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`Archivo de respaldo no encontrado en: ${filePath}`);
  }

  return new Promise((resolve, reject) => {
    let cmd;
    if (filePath.endsWith('.gz')) {
      cmd = `gunzip -c "${filePath}" | psql "${dbUrl}"`;
    } else {
      cmd = `psql "${dbUrl}" -f "${filePath}"`;
    }

    console.log(`Ejecutando restauración desde psql...`);
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error en psql restore: ${error.message}`);
        console.error(stderr);
        reject(error);
        return;
      }
      console.log('Restauración completada con éxito.');
      resolve();
    });
  });
}

// Invocación directa
if (import.meta.url === `file://${process.argv[1]}`) {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error('Uso: node scripts/restore.mjs <ruta_al_archivo.sql>');
    process.exit(1);
  }
  runRestore(path.resolve(fileArg)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
