# Backups — Degano

Dos frentes: **base de datos** (Mongo) y **archivos** (S3).

## 1. Backup de la base (automático, diario)

Lo hace el workflow [`db-backup.yml`](./db-backup.yml): cada día hace un `mongodump` completo y lo sube a un bucket S3 de backups.

### Setup (una vez)

1. **Crear el bucket de backups** (privado, con versionado). Desde tu compu con las credenciales AWS cargadas:
   ```bash
   aws s3api create-bucket --bucket degano-db-backups \
     --region us-east-2 --create-bucket-configuration LocationConstraint=us-east-2
   aws s3api put-bucket-versioning --bucket degano-db-backups \
     --versioning-configuration Status=Enabled
   # Bloquear acceso público
   aws s3api put-public-access-block --bucket degano-db-backups \
     --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
   ```

2. **Cargar los secrets en GitHub** (repo → Settings → Secrets and variables → Actions → *New repository secret*):
   - `MONGODB_URI` — la connection string (la misma de `.env.local`)
   - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
   - `BACKUP_BUCKET` — `degano-db-backups`

3. **Probar**: pestaña *Actions* → *Backup diario de MongoDB* → *Run workflow*. Debería subir un `degano-backup-YYYY-MM-DD_HHMMSS.archive.gz` a `s3://degano-db-backups/mongo/`.

### Retención (opcional, recomendado)

Para no acumular backups para siempre, agregar una lifecycle rule que borre los de más de N días:
```bash
aws s3api put-bucket-lifecycle-configuration --bucket degano-db-backups \
  --lifecycle-configuration '{"Rules":[{"ID":"expira-backups-90d","Filter":{"Prefix":"mongo/"},"Status":"Enabled","Expiration":{"Days":90}}]}'
```

### Restaurar un backup

```bash
# 1. Bajar el backup deseado
aws s3 cp s3://degano-db-backups/mongo/degano-backup-XXXX.archive.gz .

# 2. Restaurar (⚠️ apunta a la base destino con cuidado)
mongorestore --uri="<MONGODB_URI_destino>" --archive=degano-backup-XXXX.archive.gz --gzip
# Para restaurar SOBRE la base existente, agregar --drop (reemplaza colecciones)
```

## 2. Protección de archivos (S3 versioning)

Los archivos de eventos/presupuestos/equipos viven en S3. Activar **versioning** en cada bucket para que un borrado o sobrescritura (accidental o malicioso) sea recuperable:

```bash
for B in degano-events-files degano-equipment-uploads degano-bands degano-budgets; do
  aws s3api put-bucket-versioning --bucket "$B" --versioning-configuration Status=Enabled
done
```

> Con versioning, un objeto borrado queda como "delete marker" y se puede restaurar la versión anterior. Opcional: agregar lifecycle para expirar versiones viejas y controlar costo.

## Regla 3-2-1

3 copias, 2 medios, 1 fuera del sistema principal. Con esto tenés: la base en Atlas + el dump diario en S3 (offsite) + (opcional) replicación a otra región/cuenta para el nivel más alto.
