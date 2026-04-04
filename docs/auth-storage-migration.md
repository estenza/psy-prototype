# Auth Storage Migration

## Why This Exists

Production historically started with SQLite auth data inside the Docker image.
That caused two unsafe side effects:

- user/session data could ship inside the image and survive as baked-in state
- `.env.local` could also leak into the image if Docker context was not filtered

The repository now prevents that by:

- excluding `data/` and `.env*` from Docker build context
- forcing build-time auth access to use a temporary SQLite file outside `/app/data`
- refusing to use SQLite fallback when `APP_ENV=production` and
  `AUTH_DATABASE_URL` is missing

## Target Production Runtime

Production auth storage should now be:

- PostgreSQL, via `AUTH_DATABASE_URL`
- on the existing Yandex Cloud network `enpgiiep4cceg1u2j18d`
- deployed by `.github/workflows/deploy-production.yml`

The production workflow now expects:

- GitHub Environment `production`
- secret `YC_SA_JSON_CREDENTIALS`
- secret `AUTH_DATABASE_URL`

Recommended additional environment secrets before the first safe redeploy:

- `HYVOR_TALK_DATA_API_KEY`
- `HYVOR_TALK_CONSOLE_API_KEY`
- `AUTH_EMAIL_FROM`
- `AUTH_SMTP_HOST`
- `AUTH_SMTP_PORT`
- `AUTH_SMTP_SECURE`
- `AUTH_SMTP_USERNAME`
- `AUTH_SMTP_PASSWORD`
- `AUTH_SMTP_HELO_HOST`

## One-Time Database Setup

Create a Managed PostgreSQL cluster in the same Yandex Cloud folder and attach
it to the default VPC network:

- network id: `enpgiiep4cceg1u2j18d`
- one existing subnet option in `ru-central1-a`: `e9bbqj95mlf6766j3vs6`

For private hosts, Yandex Cloud allows connections from Serverless Containers in
the same cloud network without SSL, so the simplest first rollout is:

- `AUTH_DATABASE_URL=postgresql://...`
- `AUTH_DATABASE_SSL=false`

Source:
- https://yandex.cloud/en/docs/managed-postgresql/qa/connection

## Safe Migration Of Current Production Users

Before the first production redeploy with PostgreSQL:

1. Pull the currently active production image.
2. Extract the baked-in SQLite auth DB from `/app/data/app.db`.
3. Import it into PostgreSQL with the migration script.
4. Only after that deploy the new `main` revision.

Example flow:

```bash
docker pull cr.yandex/crphtumcsi9us93u61ir/psy:latest
docker create --name psy-prod-auth-snapshot cr.yandex/crphtumcsi9us93u61ir/psy:latest
docker cp psy-prod-auth-snapshot:/app/data/app.db /tmp/psy-production-auth.db
docker rm psy-prod-auth-snapshot

AUTH_DATABASE_URL='postgresql://user:password@host:6432/database' \
AUTH_DATABASE_SSL=false \
yarn migrate:auth:postgres /tmp/psy-production-auth.db
```

This copies:

- `users`
- `sessions`
- `password_reset_tokens`

The migration is idempotent on primary keys and can be rerun if needed.

## After Migration

1. Add `AUTH_DATABASE_URL` to GitHub `Settings -> Environments -> production -> Secrets and variables -> Actions`
2. Add Hyvor runtime secrets there too
3. Add SMTP runtime secrets there if password reset emails must work on live
4. Merge the production-safe changes to `main`
5. Let GitHub Actions deploy production

## Verification Checklist

After the first safe production deploy:

- `POST /api/auth/password-reset/request` should return a real route, not `404`
- production auth data should come from PostgreSQL, not `/app/data/app.db`
- the built Docker image should no longer contain `.env.local`
- the built Docker image should no longer contain mutable auth data under `/app/data`
