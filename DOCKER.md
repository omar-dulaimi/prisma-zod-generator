# Docker Setup for Testing

This repository includes a Docker Compose setup to make testing easier across all supported database providers.

## Quick Start

1. **Start all databases:**
   ```bash
   pnpm docker:up
   ```

2. **Copy environment variables:**
   ```bash
   cp .env.example .env
   ```

3. **Run tests:**
   ```bash
   pnpm test:docker
   ```

4. **Stop databases:**
   ```bash
   pnpm docker:down
   ```

## Available Services

The Docker Compose setup includes the following services that match the existing `.env.example` configuration:

| Service | Port | Database | Username | Password |
|---------|------|----------|----------|----------|
| PostgreSQL | 5432 | test | user | password |
| MySQL | 3306 | test | user | password |
| MongoDB | 27017 | test | - | - |
| SQL Server | 1433 | test | sa | password |

## Docker Commands

- `pnpm docker:up` - Start all database services
- `pnpm docker:down` - Stop all database services
- `pnpm docker:logs` - View logs from all services
- `pnpm docker:ps` - Check status of all services
- `pnpm docker:reset` - Reset all data and restart services

## Test Commands

- `pnpm test:docker` - Start databases and run multi-provider tests
- `pnpm test:docker:full` - Start databases and run all tests
- `pnpm test:docker:postgresql` - Start PostgreSQL and run PostgreSQL tests
- `pnpm test:docker:mysql` - Start MySQL and run MySQL tests
- `pnpm test:docker:mongodb` - Start MongoDB and run MongoDB tests
- `pnpm test:docker:sqlserver` - Start SQL Server and run SQL Server tests

## Environment Variables

The Docker setup uses the same environment variables as defined in `.env.example`:

- `POSTGRESQL_URL="postgresql://user:password@localhost:5432/test"`
- `MYSQL_URL="mysql://user:password@localhost:3306/test"`
- `MONGODB_URL="mongodb://localhost:27017/test"`
- `SQLSERVER_URL="sqlserver://localhost:1433;database=test;user=sa;password=password;encrypt=true;trustServerCertificate=true"`

## Health Checks

All database services include health checks to ensure they're ready before running tests. You can check the status with:

```bash
pnpm docker:ps
```

## Data Persistence

Database data is persisted in Docker volumes. To reset all data:

```bash
pnpm docker:reset
```

This setup ensures consistent testing environments across different machines and makes it easy to test against multiple database providers without manual setup.