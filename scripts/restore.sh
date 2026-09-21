#!/bin/bash
# Script de Restauración Manual para Supabase Postgres

# Cargar variables de entorno locales si existen
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Validar que exista la variable de conexión
if [ -z "$DATABASE_URL" ]; then
  echo "Error: La variable DATABASE_URL no está definida en tu .env o entorno."
  exit 1
fi

if [ -z "$1" ]; then
  echo "Uso: $0 <ruta_al_archivo_respaldo.sql o .sql.gz>"
  exit 1
fi

BACKUP_FILE="$1"

# Verificar existencia del archivo
if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Archivo de respaldo no encontrado en: $BACKUP_FILE"
  exit 1
fi

echo "Iniciando restauración en Supabase..."
echo "ADVERTENCIA: Esto puede sobrescribir tablas y relaciones existentes."
read -p "¿Estás seguro de que deseas continuar? (s/n): " confirm
if [[ ! "$confirm" =~ ^[sS]$ ]]; then
  echo "Operación cancelada por el usuario."
  exit 0
fi

# Restaurar según el tipo de archivo (comprimido o texto plano)
if [[ "$BACKUP_FILE" == *.gz ]]; then
  echo "Descomprimiendo y aplicando respaldo..."
  gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL"
else
  echo "Aplicando respaldo..."
  psql "$DATABASE_URL" -f "$BACKUP_FILE"
fi

if [ $? -eq 0 ]; then
  echo "Restauración completada con éxito."
else
  echo "Ocurrió un error al aplicar el respaldo. Revisa la salida de error de psql."
  exit 1
fi
