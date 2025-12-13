#!/bin/sh
set -e

# Run database migrations
echo "Running database migrations..."
alembic upgrade head

# Then exec the container's main process (what's been passed as CMD)
exec "$@"
