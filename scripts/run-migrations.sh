#!/usr/bin/env bash
# Run pending Prisma migrations against Turso production database.
# Usage: ./scripts/run-migrations.sh
#
# Requires: turso CLI (brew install tursodatabase/tap/turso)
# Or run from the project root: npx prisma migrate deploy

set -euo pipefail

echo "=== Õpetaja Tagasiside — Production Migration ==="
echo ""
echo "Option 1: Use Prisma migrate (recommended)"
echo "  npx prisma migrate deploy"
echo ""
echo "Option 2: Run SQL manually via Turso CLI"
echo "  turso db shell maasiku-prod < scripts/all-pending-migrations.sql"
echo ""

# Check if prisma is available
if command -v npx &> /dev/null; then
  echo "Running: npx prisma migrate deploy..."
  npx prisma migrate deploy
  echo ""
  echo "✅ Migrations applied successfully!"
else
  echo "npx not found. Install Node.js or run the SQL manually."
  exit 1
fi
