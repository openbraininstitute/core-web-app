# Fullstack Development Setup

This Docker Compose configuration allows you to run both the Core Web App frontend and the Entity Core backend together for fullstack development.

## Quick Start

### Option 1: Using the setup script (Recommended)

**With database dump:**
```bash
# Initialize with a database dump file
./setup-fullstack.sh /path/to/your/entitycore_dump.dump
```

**Without database dump:**
```bash
# Start with empty database
./setup-fullstack.sh
```

### Option 2: Manual setup

1. **Set up environment variables** (choose one option):
   
   **Option A: Use your existing .env.local file**
   ```bash
   # Your existing .env.local file will be used automatically
   # Just make sure it has the variables you need
   ```
   
   **Option B: Create a dedicated fullstack environment file**
   ```bash
   # Create .env.fullstack with your variables
   # Then update docker-compose.fullstack.yml to use it
   ```

2. **Start all services**:
   ```bash
   docker-compose -f docker-compose.fullstack.yml up --build
   ```

3. **Access the applications**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - MinIO Console: http://localhost:9001 (entitycore/entitycore)

## Database Initialization with Dump File

The setup supports initializing the database with a PostgreSQL dump file (`.dump` format), followed by running entitycore migrations:

### Workflow
1. **Services are started** with Docker Compose
2. **Database is ready** and healthy
3. **Dump file is restored** automatically by the setup script using `pg_restore`
4. **Entitycore migrations** are run to update the schema to the latest version (`alembic upgrade head`)
5. **Database is ready** with both the dump data and the latest schema

### Usage Options

**Option 1: Using setup script (Recommended)**
```bash
# Initialize with a dump file (.dump format)
./setup-fullstack.sh /path/to/your/entitycore_dump.dump

# Or with a relative path
./setup-fullstack.sh ./data/entitycore_dump.dump

# Example with actual file
./setup-fullstack.sh ~/Downloads/db_2025.6.7-9-g16b05c3.dump
```

**Option 2: Manual restoration (Advanced)**
```bash
# Start services first
docker-compose -f docker-compose.fullstack.yml up -d

# Wait for database to be healthy, then restore manually
docker-compose -f docker-compose.fullstack.yml exec -e DUMPFILE=/data/dump.dump -e PGUSER=entitycore -e PGPASSWORD=entitycore -e PGHOST=localhost -e PGPORT=5432 -e PGDATABASE=entitycore db bash -c 'dropdb --force $PGDATABASE && createdb $PGDATABASE && pg_restore --clean --if-exists --exit-on-error --no-owner --dbname $PGDATABASE $DUMPFILE && psql -c "ANALYZE;"'

# Run migrations
docker-compose -f docker-compose.fullstack.yml exec backend alembic upgrade head
```

### Important Notes
- **Dump file format**: Must be PostgreSQL `.dump` format (created with `pg_dump -Fc`)
- **Automatic cleanup**: The setup script automatically removes existing database volumes for clean initialization
- **Data verification**: The script verifies that data was restored correctly
- **Migration handling**: Migrations are applied after restoration to ensure schema compatibility

## Services

### Frontend (Core Web App)
- **Container**: `core-web-app-frontend`
- **Port**: 3000
- **Features**: Hot reload, file watching, development mode
- **Dependencies**: Backend service

### Backend (Entity Core)
- **Container**: `entitycore-backend`
- **Port**: 8000
- **Features**: FastAPI application with health checks, automatic migrations
- **Dependencies**: Database and MinIO

### Database (PostgreSQL)
- **Container**: `entitycore-db`
- **Port**: 5432
- **Credentials**: entitycore/entitycore
- **Database**: entitycore

### MinIO (S3 Storage)
- **Container**: `entitycore-minio`
- **Ports**: 9000 (API), 9001 (Console)
- **Credentials**: entitycore/entitycore
- **Bucket**: entitycore-data-dev

## Environment Variables

### Where to Put Your Variables

You have several options for managing environment variables:

#### Option 1: Use Your Existing .env.local (Recommended)
The Docker Compose is already configured to use your existing `.env.local` file:

```bash
# Your .env.local file is automatically loaded
# Just add your variables there
NEXT_PUBLIC_ACCOUNTING_BASE_URL=your_value
NEXT_PUBLIC_BLUE_NAAS_URL=your_value
# ... add all your other variables
```

#### Option 2: Create a Dedicated .env.fullstack File
Create a new file `.env.fullstack` with your variables:

```bash
# Create the file
touch .env.fullstack

# Add your variables
echo "NEXT_PUBLIC_ACCOUNTING_BASE_URL=your_value" >> .env.fullstack
echo "NEXT_PUBLIC_BLUE_NAAS_URL=your_value" >> .env.fullstack
# ... add all your variables
```

Then update `docker-compose.fullstack.yml`:
```yaml
env_file:
  - .env.fullstack  # Change from .env.local to .env.fullstack
```

#### Option 3: Use Multiple Environment Files
You can load multiple environment files:

```yaml
env_file:
  - .env.local      # Your existing file
  - .env.fullstack  # Additional fullstack-specific variables
```

### Key Environment Variables

**Frontend Variables:**
- `NEXT_PUBLIC_ENTITY_CORE_URL`: Backend API URL (`http://localhost:8000`)
- `KEYCLOAK_ISSUER`: Keycloak realm URL for authentication
- `KEYCLOAK_CLIENT_ID`: Keycloak client ID
- `KEYCLOAK_CLIENT_SECRET`: Keycloak client secret
- All your existing `NEXT_PUBLIC_*` variables

**Backend Variables:**
- `DATABASE_URL`: PostgreSQL connection string
- `S3_ENDPOINT_URL`: MinIO endpoint URL
- `S3_ACCESS_KEY_ID`: MinIO access key
- `S3_SECRET_ACCESS_KEY`: MinIO secret key
- `KEYCLOAK_URL`: Keycloak realm URL for token validation

## Development Features

### Hot Reload
- Frontend: Source code changes are synced automatically
- Backend: Application restarts on code changes
- Database: Persistent data storage

### File Watching
- Frontend watches: `src/`, `public/`, config files
- Backend watches: `app/` directory
- Ignores: `node_modules/`, `.next/`, build outputs

## Commands

### Using the Setup Script (Recommended)
```bash
# Full setup with database dump
./setup-fullstack.sh /path/to/dump.dump

# Full setup without database dump  
./setup-fullstack.sh
```

### Direct Docker Compose Commands
```bash
# Change to docker-compose directory first
cd docker-compose

# Start all services
docker-compose -f docker-compose.fullstack.yml up

# Start in background
docker-compose -f docker-compose.fullstack.yml up -d

# Rebuild and start
docker-compose -f docker-compose.fullstack.yml up --build

# Stop all services
docker-compose -f docker-compose.fullstack.yml down

# View logs
docker-compose -f docker-compose.fullstack.yml logs -f

# View logs for specific service
docker-compose -f docker-compose.fullstack.yml logs -f frontend
docker-compose -f docker-compose.fullstack.yml logs -f backend

# Execute commands in containers
docker-compose -f docker-compose.fullstack.yml exec frontend sh
docker-compose -f docker-compose.fullstack.yml exec backend sh
```

### Using Make Commands
```bash
# Change to docker-compose directory first
cd docker-compose

# Available make targets
make help
make up
make down
make logs
make build
```

## Troubleshooting

### Port Conflicts
If you have port conflicts, modify the port mappings in the compose file:
```yaml
ports:
  - '3001:3000'  # Frontend on 3001
  - '8001:8000'  # Backend on 8001
```

### Database Issues
- Check if PostgreSQL is healthy: `docker-compose -f docker-compose.fullstack.yml ps`
- Reset database: `docker-compose -f docker-compose.fullstack.yml down -v`
- Database restoration fails: Ensure dump file is in `.dump` format (not `.sql`)
- Empty tables after restoration: Check that dump file path is correct and file is not empty

### Backend Health Check
The backend includes a health check endpoint. If it fails:
- Check backend logs: `docker-compose -f docker-compose.fullstack.yml logs backend`
- Verify database connection
- Check MinIO availability

### Frontend Connection Issues
- Ensure `NEXT_PUBLIC_ENTITY_CORE_URL` is set correctly
- Check if backend is running and healthy
- Verify network connectivity between containers

## Data Persistence

- Database data: Stored in `pgdata` volume
- MinIO data: Stored in `s3data` volume
- To reset all data: `docker-compose -f docker-compose.fullstack.yml down -v`

## Network

All services run on the `fullstack-network` bridge network, allowing them to communicate using service names as hostnames.

## File Structure

```
docker-compose/
├── backend-startup.sh          # Backend startup script with migrations
├── docker-compose.fullstack.yml # Main Docker Compose configuration
├── Makefile.fullstack          # Convenient make commands
└── README.fullstack.md         # This documentation

../
└── setup-fullstack.sh          # Main setup script with database restoration
```

## How It Works

1. **Setup Script**: `setup-fullstack.sh` orchestrates the entire setup process
2. **Database Restoration**: Handled by the setup script using `pg_restore` commands
3. **Backend Startup**: `backend-startup.sh` waits for database and runs migrations
4. **Service Health**: All services have health checks and dependencies configured
5. **Development Features**: Hot reloading and file watching enabled for development
