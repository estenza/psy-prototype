# PostgreSQL migrations

PostgreSQL schema changes for staging and production must be added here as
ordered SQL migrations.

Run migrations before starting or deploying the app:

```bash
npm run migrate:auth:postgres:schema
```

Runtime schema synchronization is disabled by default. The app verifies that
the latest migration has been applied and fails fast when the database is
behind the code.
