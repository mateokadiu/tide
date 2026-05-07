#!/usr/bin/env bash
# Nightly pg_dump → object storage. Retains 30 days via lifecycle policy on
# the bucket itself; this script just writes a new key each night.
#
# Cron line (root):
#   0 3 * * *   /opt/tide/repo/infra/scripts/backup.sh >> /var/log/tide-backup.log 2>&1

set -euo pipefail

: "${BACKUP_BUCKET:=tide-backups}"
: "${BACKUP_PREFIX:=postgres}"
: "${BACKUP_ENDPOINT:=http://minio:9000}"
: "${MINIO_ALIAS:=local}"
: "${POSTGRES_DSN:?POSTGRES_DSN required}"
: "${MINIO_ROOT_USER:?MINIO_ROOT_USER required}"
: "${MINIO_ROOT_PASSWORD:?MINIO_ROOT_PASSWORD required}"

STAMP=$(date -u +"%Y%m%dT%H%M%SZ")
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

KEY="${BACKUP_PREFIX}/tide-${STAMP}.sql.gz"
FILE="${TMP}/tide-${STAMP}.sql.gz"

echo "[backup] dumping postgres → ${FILE}"
pg_dump --no-owner --no-privileges --format=plain "$POSTGRES_DSN" | gzip -9 > "$FILE"

echo "[backup] uploading → s3://${BACKUP_BUCKET}/${KEY}"
if ! command -v mc >/dev/null 2>&1; then
  curl -fSL https://dl.min.io/client/mc/release/linux-amd64/mc -o /usr/local/bin/mc
  chmod +x /usr/local/bin/mc
fi
mc alias set "$MINIO_ALIAS" "$BACKUP_ENDPOINT" "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null
mc mb -p "${MINIO_ALIAS}/${BACKUP_BUCKET}" >/dev/null 2>&1 || true
mc cp "$FILE" "${MINIO_ALIAS}/${BACKUP_BUCKET}/${KEY}"

echo "[backup] ok · key=${KEY} · size=$(stat -c%s "$FILE" 2>/dev/null || stat -f%z "$FILE") bytes"
