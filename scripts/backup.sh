#!/bin/bash
# Script de Respaldo Manual / Automático para Supabase Postgres

# Cargar variables de entorno locales si existen
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Validar que exista la variable de conexión
if [ -z "$DATABASE_URL" ]; then
  echo "Error: La variable DATABASE_URL no está definida en tu .env o entorno."
  exit 1
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="$(dirname "$0")/../backups"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/supabase_backup_$TIMESTAMP.sql"

echo "Iniciando respaldo de la base de datos Supabase..."
echo "Host remoto en ejecución..."

# Ejecutar pg_dump omitiendo propietarios y privilegios específicos
pg_dump "$DATABASE_URL" --no-owner --no-privileges -f "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "Respaldo completado exitosamente: $BACKUP_FILE"
  # Comprimir para ahorrar espacio en el VPS
  gzip "$BACKUP_FILE"
  echo "Respaldo comprimido: ${BACKUP_FILE}.gz"
else
  echo "Error al ejecutar pg_dump. Verifica tus credenciales o conexión a la red."
  exit 1
fi
