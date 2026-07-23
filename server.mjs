import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Custom CORS middleware to avoid extra package installation
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-user-id');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const dbUrl = process.env.DATABASE_URL;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Falta configurar VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en las variables de entorno.');
}

const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder');

// Endpoint para disparar el backup
app.get('/api/backup', async (req, res) => {
  const userId = req.headers['x-user-id'];

  if (!userId) {
    return res.status(401).json({ error: 'No autorizado: Falta cabecera x-user-id' });
  }

  try {
    // 1. Validar privilegios en la tabla custom 'users'
    const { data: user, error: dbError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (dbError || !user) {
      console.error('Error de autenticación en backend:', dbError);
      return res.status(403).json({ error: 'Acceso denegado: Usuario no encontrado o error en BD' });
    }

    const allowedRoles = ['admin', 'root', 'superadmin'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Acceso denegado: Privilegios insuficientes' });
    }

    // 2. Ejecutar pg_dump usando DATABASE_URL
    if (!dbUrl) {
      return res.status(500).json({ error: 'La variable DATABASE_URL no está configurada en el servidor (VPS)' });
    }

    const timestamp = new Date().toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
    const backupDir = path.resolve('backups');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const fileName = `supabase_backup_${timestamp}.sql`;
    const filePath = path.join(backupDir, fileName);

    console.log(`Generando backup en: ${filePath}`);
    const cmd = `pg_dump "${dbUrl}" --no-owner --no-privileges -f "${filePath}"`;
    
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error('Fallo al ejecutar pg_dump:', error.message);
        console.error(stderr);
        return res.status(500).json({ error: 'Error al ejecutar pg_dump en el sistema host' });
      }

      // Enviar archivo para descarga automática
      res.download(filePath, fileName, (err) => {
        if (err) {
          console.error('Error al descargar el archivo:', err);
        }
      });
    });

  } catch (error) {
    console.error('Error en endpoint backup:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Servir la compilación del frontend en producción
const __dirname = path.resolve();
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Servidor Express para Backups corriendo en puerto ${PORT}`);
});
