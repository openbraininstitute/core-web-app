#!/bin/bash
# Complete Fullstack Setup Script
# Usage: ./setup-fullstack.sh [dump-file-path]

set -e

echo "🚀 Setting up Fullstack Development Environment"
echo "=============================================="

# Check if dump file is provided
if [ $# -eq 0 ]; then
    echo "❌ Please provide a dump file path as parameter"
    echo "Usage: ./setup-fullstack.sh /path/to/your/database.dump"
    exit 1
fi

DUMP_FILE="$1"

# Check if dump file exists
if [ ! -f "$DUMP_FILE" ]; then
    echo "❌ Dump file '$DUMP_FILE' not found!"
    exit 1
fi

DUMP_FILE_ABS=$(realpath "$DUMP_FILE")
echo "📦 Database dump file: $DUMP_FILE_ABS"

# Check if dump file has .dump extension (PostgreSQL custom format)
if [[ ! "$DUMP_FILE" == *.dump ]]; then
    echo "⚠️  Warning: Dump file should have .dump extension for PostgreSQL custom format"
    echo "   If this is a .sql file, consider converting it to .dump format using:"
    echo "   pg_dump -Fc -f output.dump input.sql"
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose > /dev/null 2>&1; then
    echo "❌ docker-compose is not installed. Please install it and try again."
    exit 1
fi

echo "✅ Docker and docker-compose are available"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  .env.local not found. Creating a basic one..."
    cat > .env.local << EOF
# Fullstack Development Environment
NODE_ENV=development
NEXT_PUBLIC_ENTITY_CORE_URL=http://localhost:8000
COMMIT_SHA=latest
EOF
    echo "✅ Created .env.local with basic configuration"
    echo "📝 Please review and update .env.local with your specific configuration"
else
    echo "✅ .env.local found"
fi

# Check if entitycore directory exists
if [ ! -d "../entitycore" ]; then
    echo "❌ entitycore directory not found at ../entitycore"
    echo "   Please ensure the entitycore backend is in the correct location"
    exit 1
fi

echo "✅ entitycore directory found"

# Stop any existing services
echo "🛑 Stopping any existing services..."
docker-compose -f docker-compose/docker-compose.fullstack.yml down -v 2>/dev/null || true

# Remove existing database volume for clean initialization
echo "🗑️  Removing existing database volume for clean initialization..."
docker volume rm core-web-app_pgdata 2>/dev/null || true

# Set environment variable for dump file
export DB_DUMP_FILE="$DUMP_FILE_ABS"

# Build and start services
echo "🔨 Building and starting services..."
docker-compose -f docker-compose/docker-compose.fullstack.yml up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."

# Wait for database
echo "   - Waiting for database..."
for i in {1..30}; do
    if docker-compose -f docker-compose/docker-compose.fullstack.yml exec -T db pg_isready -U entitycore >/dev/null 2>&1; then
        echo "   ✅ Database is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "   ❌ Database failed to start within 60 seconds"
        docker-compose -f docker-compose/docker-compose.fullstack.yml logs db
        exit 1
    fi
    sleep 2
done

# If dump file was provided, restore it now that database is ready
if [ -n "$DUMP_FILE_ABS" ]; then
    echo "   - Restoring database from dump file..."
    
    # Run the restoration following entitycore's exact approach
    docker-compose -f docker-compose/docker-compose.fullstack.yml exec -e DUMPFILE=/data/dump.dump -e PGUSER=entitycore -e PGPASSWORD=entitycore -e PGHOST=localhost -e PGPORT=5432 -e PGDATABASE=entitycore db bash -c 'dropdb --force $PGDATABASE && createdb $PGDATABASE && pg_restore --clean --if-exists --exit-on-error --no-owner --dbname $PGDATABASE $DUMPFILE && psql -c "ANALYZE;"' >/dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "   ✅ Database restoration completed"
    else
        echo "   ❌ Database restoration failed"
        exit 1
    fi
    
    # Verify data is present
    MORPHOLOGY_COUNT=$(docker-compose -f docker-compose/docker-compose.fullstack.yml exec -T db psql -U entitycore -d entitycore -t -c "SELECT COUNT(*) FROM reconstruction_morphology;" 2>/dev/null | tr -d ' \n')
    if [ "$MORPHOLOGY_COUNT" -gt 0 ]; then
        echo "   ✅ Verified $MORPHOLOGY_COUNT morphology records restored"
    else
        echo "   ⚠️  Warning: No morphology records found after restoration"
    fi
fi

# Wait for backend (which handles migrations)
echo "   - Waiting for backend (running migrations)..."
for i in {1..60}; do
    if docker-compose -f docker-compose/docker-compose.fullstack.yml exec -T backend python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" >/dev/null 2>&1; then
        echo "   ✅ Backend is ready"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "   ❌ Backend failed to start within 120 seconds"
        echo "   📋 Backend logs:"
        docker-compose -f docker-compose/docker-compose.fullstack.yml logs backend
        exit 1
    fi
    sleep 2
done

# Wait for frontend
echo "   - Waiting for frontend..."
for i in {1..30}; do
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        echo "   ✅ Frontend is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "   ❌ Frontend failed to start within 60 seconds"
        docker-compose -f docker-compose/docker-compose.fullstack.yml logs frontend
        exit 1
    fi
    sleep 2
done

echo ""
echo "🎉 Fullstack Development Environment is Ready!"
echo "=============================================="
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📊 Database: localhost:5432 (entitycore/entitycore)"
echo "🗄️  MinIO: http://localhost:9000 (entitycore/entitycore)"
echo ""
echo "📋 Useful commands:"
echo "   View logs:     docker-compose -f docker-compose/docker-compose.fullstack.yml logs -f"
echo "   Stop services: docker-compose -f docker-compose/docker-compose.fullstack.yml down"
echo "   Restart:       docker-compose -f docker-compose/docker-compose.fullstack.yml restart"
echo ""
echo "✅ Database has been restored from: $DUMP_FILE_ABS"
echo "✅ Alembic migrations have been applied"
echo "✅ All services are running and healthy"