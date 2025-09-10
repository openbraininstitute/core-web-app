#!/bin/bash
# Custom backend startup script for fullstack setup
# Handles dump restoration and migrations

set -e

echo "🚀 Starting entitycore backend with dump restoration..."

# Set environment variables
export HOST=${HOST:-0.0.0.0}
export PORT=${PORT:-8000}

# Wait for database to be ready (including any restoration that might be happening)
echo "⏳ Waiting for database to be ready..."
until python -c "import psycopg2; psycopg2.connect(host='entitycore-db', port=5432, user='entitycore', password='entitycore', dbname='postgres')" 2>/dev/null; do
    echo "Database is unavailable - sleeping"
    sleep 2
done

echo "✅ PostgreSQL server is ready"

# Wait for entitycore database to be ready
echo "⏳ Waiting for entitycore database to be ready..."
until python -c "import psycopg2; psycopg2.connect(host='entitycore-db', port=5432, user='entitycore', password='entitycore', dbname='entitycore')" 2>/dev/null; do
    echo "Database is unavailable - sleeping"
    sleep 2
done

echo "✅ Database is ready"

# Run migrations (this will handle any schema updates needed)
echo "🔄 Running Alembic migrations..."
alembic upgrade head

# Start the application
echo "🚀 Starting entitycore application..."
exec uvicorn app.application:app --host $HOST --port $PORT
