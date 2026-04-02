# Staging Deployment Note

## Staging Architecture

Staging reuses the same Yandex Cloud pattern as production:

- Docker image in the existing Container Registry
- Serverless Container as runtime target
- API Gateway in front of the container
- Custom subdomain for browser review

Staging is separated from production by:

- separate branch trigger: `develop`
- separate image tag: `cr.yandex/crphtumcsi9us93u61ir/psy:staging`
- separate Serverless Container: `psy-staging-container`
- separate API Gateway: `psy-staging-gateway`
- separate custom hostname target: `staging.vnutri.live`
- separate runtime environment variables for auth URL and auth DB path

Production resources remain unchanged.

## Created Yandex Cloud Resources

- Serverless Container:
  - name: `psy-staging-container`
  - id: `bbau5donub8hrok6eqoc`
  - default URL: `https://bbau5donub8hrok6eqoc.containers.yandexcloud.net/`
- API Gateway:
  - name: `psy-staging-gateway`
  - id: `d5d6qfoc60m48deqn2q7`
  - default gateway URL: `https://d5d6qfoc60m48deqn2q7.l3hh3szr.apigw.yandexcloud.net`
- Managed certificate request:
  - name: `vnutri-live-staging-cert`
  - id: `fpqed1r4fbmspgi2219k`
  - domain: `staging.vnutri.live`

## Branch Mapping

- `develop` branch -> staging deploy
- `main` branch -> production deploy
- `feature/*` branches -> PRs into `develop`
- `hotfix/*` branches -> PRs into `main`, then merge back into `develop`

GitHub Actions workflows:

- `.github/workflows/deploy-staging.yml`
- `.github/workflows/deploy-production.yml`

Shared GitHub Actions setup instructions live in
[github-actions-deploy-setup.md](./github-actions-deploy-setup.md).

## Staging Deploy Flow

1. Push to `develop`
2. GitHub Actions authenticates to Yandex Cloud with the `YC_SA_JSON_CREDENTIALS`
   secret from the `staging` GitHub Environment
3. Docker Buildx builds `linux/amd64`
4. Image is pushed to `cr.yandex/crphtumcsi9us93u61ir/psy:staging`
5. New revision is deployed to `psy-staging-container`
6. Smoke check runs against `https://staging.vnutri.live`
7. UI is reviewed on `https://staging.vnutri.live`

## DNS Records For Staging

The DNS zone `vnutri.live` already exists in Yandex Cloud DNS, and the staging
records were added there.

Current staging DNS records:

- `_acme-challenge.staging.vnutri.live. 300 CNAME fpqed1r4fbmspgi2219k.cm.yandexcloud.net.`
- `staging.vnutri.live. 300 CNAME d5d6qfoc60m48deqn2q7.l3hh3szr.apigw.yandexcloud.net.`

If you later move DNS away from Yandex Cloud, these are the exact records that
must exist at the registrar or external DNS provider.

## Staging Environment Variables

Currently set on staging container revisions:

- `APP_ENV=staging`
- `AUTH_APP_URL=https://staging.vnutri.live`
- `AUTH_DATABASE_PATH=/tmp/psy-staging.db`

Variables that should be configured separately for staging vs production if you
enable them:

- `APP_ENV`
- `AUTH_APP_URL`
- `AUTH_DATABASE_PATH`
- `AUTH_EMAIL_FROM`
- `AUTH_SMTP_HOST`
- `AUTH_SMTP_PORT`
- `AUTH_SMTP_SECURE`
- `AUTH_SMTP_USERNAME`
- `AUTH_SMTP_PASSWORD`
- `AUTH_SMTP_HELO_HOST`
- `AUTH_INITIAL_MODERATOR_EMAILS`
- `HYVOR_TALK_WEBSITE_ID`
- `HYVOR_TALK_DATA_API_KEY`
- `HYVOR_TALK_CONSOLE_API_KEY`
- `HYVOR_TALK_DATA_API_PUBLIC`

Notes:

- In staging, branding is driven only by `APP_ENV=staging`. The blue logo is not tied to the branch name and is not inferred from the hostname.
- Auth/session isolation is already separated by host and by staging container DB path.
- If you want staging comments to be isolated from production comments, use a separate Hyvor website and separate Hyvor API keys.
- SMTP settings should be separate if staging should send password reset emails without touching production mail flow.
- The `/` route is forced dynamic so staging does not keep serving stale environment-specific UI after a fresh deploy.

## Certificate And Domain Status

- Managed certificate `fpqed1r4fbmspgi2219k` for `staging.vnutri.live` is
  `ISSUED`
- `staging.vnutri.live` is attached to `psy-staging-gateway`
- HTTPS is live on `https://staging.vnutri.live`

## GitHub Environment Setup

Create a GitHub Environment named `staging` and add:

- `YC_SA_JSON_CREDENTIALS`
  Yandex Cloud authorized key JSON for service account `ajeh4qnls5se5raj12ua`

Routine staging deploys should go through GitHub Actions. The local
`scripts/deploy-staging.sh` flow is only an emergency fallback.

## Legacy Branch Cleanup

The active staging branch is now `develop`.

The legacy remote `staging` branch has been removed from the active workflow and
should not be used anymore.

If an older local clone still has a `staging` branch, clean it up like this:

```bash
git fetch origin --prune
git branch -m staging develop
git branch --set-upstream-to=origin/develop develop
```

If you already have a local `develop` branch, simply delete the old local
`staging` branch after confirming it has no unique commits.
