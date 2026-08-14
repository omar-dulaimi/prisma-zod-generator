# Docker Setup

This repository includes a Docker Compose setup that brings up one server per
supported database provider.

> **The test suite does not need any of this.** Nothing under `tests/` opens a
> database connection — the provider suites only run `prisma generate`, which
> reads the schema and never connects. `pnpm test` passes on a machine with no
> Docker installed. These services are here for manually checking generated
> schemas against a real server.

## Quick Start

1. **Start all databases:**
   ```bash
   pnpm docker:up
   ```

2. **Copy environment variables:**
   ```bash
   cp .env.example .env
   ```

3. **Stop databases:**
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

To start a single service, name it: `docker compose up -d postgresql`.

## Running the tests

Just `pnpm test` — no databases required. To run only the provider suites:

```bash
pnpm test tests/multi-provider/
pnpm test tests/multi-provider/ -t 'PostgreSQL Provider Tests'
```

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