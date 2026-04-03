# GitHub Actions Deploy Setup

## Chosen Auth Path

Both deploy workflows use the same auth model:

- GitHub Environment secret
- secret name: `YC_SA_JSON_CREDENTIALS`
- auth type: Yandex Cloud service account authorized key JSON

OIDC and Workload Identity Federation are not used in the current committed
workflows.

## Which Workflow Uses Which Secret

- Staging workflow: `.github/workflows/deploy-staging.yml`
  - branch trigger: `develop`
  - GitHub Environment: `staging`
  - required secret: `YC_SA_JSON_CREDENTIALS`
  - required secret: `AUTH_DATABASE_URL`
- Production workflow: `.github/workflows/deploy-production.yml`
  - branch trigger: `main`
  - GitHub Environment: `production`
  - required secret: `YC_SA_JSON_CREDENTIALS`
  - required secret: `AUTH_DATABASE_URL`

Production also expects runtime values to come from GitHub Environment secrets
instead of `.env.local` inside the Docker image.

The secret name is the same in both environments on purpose. GitHub keeps them
separate because they are stored per environment, not at repo level.

The secret is passed directly into the Yandex GitHub Actions input
`yc-sa-json-credentials`. The workflows do not read the key from a checked-in
file and do not run `yc container registry configure-docker` manually.

## Where To Add The Secret In GitHub

Add the secret as an environment secret, not a repository secret.

GitHub path:

1. Open the repository on GitHub
2. Go to `Settings`
3. Go to `Environments`
4. Open or create the `staging` environment
5. Open `Secrets and variables` -> `Actions`
6. Add a secret named `YC_SA_JSON_CREDENTIALS`
7. Add a secret named `AUTH_DATABASE_URL`
8. Add optional staging runtime secrets as needed:
   - `HYVOR_TALK_DATA_API_KEY`
   - `HYVOR_TALK_CONSOLE_API_KEY`
   - `AUTH_EMAIL_FROM`
   - `AUTH_SMTP_HOST`
   - `AUTH_SMTP_PORT`
   - `AUTH_SMTP_SECURE`
   - `AUTH_SMTP_USERNAME`
   - `AUTH_SMTP_PASSWORD`
   - `AUTH_SMTP_HELO_HOST`
9. Open or create the `production` environment
10. Open `Secrets and variables` -> `Actions`
11. Add a secret named `YC_SA_JSON_CREDENTIALS`
12. Add a secret named `AUTH_DATABASE_URL`
13. Add runtime secrets needed by production:
    - `HYVOR_TALK_DATA_API_KEY`
    - `HYVOR_TALK_CONSOLE_API_KEY`
    - `AUTH_EMAIL_FROM`
    - `AUTH_SMTP_HOST`
    - `AUTH_SMTP_PORT`
    - `AUTH_SMTP_SECURE`
    - `AUTH_SMTP_USERNAME`
    - `AUTH_SMTP_PASSWORD`
    - `AUTH_SMTP_HELO_HOST`

## What Value To Put In The Secret

Use the full Yandex Cloud authorized key JSON for service account:

- `ajeh4qnls5se5raj12ua`

The JSON should be the full authorized key object, not just a token, not a
service account ID, and not a path to a file.

For now, the fastest practical setup is to use the same service account JSON in
both environments. If you later want stricter separation, you can switch to
separate service accounts while keeping the same secret name per environment.

For production auth storage:

- `AUTH_DATABASE_URL` should be the full PostgreSQL connection string
- the workflow passes `AUTH_DATABASE_SSL=false` for the first private-network rollout
- the container revision is attached to network `enpgiiep4cceg1u2j18d`

Yandex Cloud documentation says private PostgreSQL hosts can be reached from a
Serverless Container in the same cloud network without SSL:
- https://yandex.cloud/en/docs/managed-postgresql/qa/connection

## One-Time GitHub Setup Still Required

1. Create GitHub Environment `staging`
2. Add environment secrets `YC_SA_JSON_CREDENTIALS` and `AUTH_DATABASE_URL` to `staging`
3. Create GitHub Environment `production`
4. Add environment secrets `YC_SA_JSON_CREDENTIALS` and `AUTH_DATABASE_URL` to `production`
5. Add Hyvor runtime secrets to `production`
6. Add SMTP runtime secrets to `production` if password reset emails must work on live
7. Optionally restrict deployment branches in GitHub Environments:
   - `staging` environment -> `develop`
   - `production` environment -> `main`
8. Protect `main` from direct pushes
9. Optionally protect `develop` as well

## Expected Result After Setup

- push to `develop` -> staging build/push/deploy with explicit runtime PostgreSQL auth config
- push to `main` -> production build/push/deploy with explicit runtime PostgreSQL auth config

If the secret is missing, the workflows fail fast at:

- `Validate deploy configuration`

That is the current expected failure mode until the environment secrets are
added.

## Verification Checklist

For staging:

1. Add `YC_SA_JSON_CREDENTIALS` to GitHub `Settings -> Environments -> staging -> Secrets and variables -> Actions`
2. Add `AUTH_DATABASE_URL` to the same Environment
3. Push a commit to `develop`
4. Open the `Deploy Staging` run in GitHub Actions
5. Confirm these steps pass:
   - `Validate deploy configuration`
   - `Authenticate Docker to Yandex Container Registry`
   - `Build and push linux/amd64 staging image`
   - `Deploy new staging Serverless Container revision`
   - `Smoke check staging URL`

For production:

1. Add `YC_SA_JSON_CREDENTIALS` to GitHub `Settings -> Environments -> production -> Secrets and variables -> Actions`
2. Add `AUTH_DATABASE_URL` to the same Environment
3. Add Hyvor runtime secrets there too before the first image without `.env.local`
4. Push or merge a commit to `main`
5. Open the `Deploy Production` run in GitHub Actions
6. Confirm these steps pass:
   - `Validate deploy configuration`
   - `Authenticate Docker to Yandex Container Registry`
   - `Build and push linux/amd64 image`
   - `Deploy new Serverless Container revision`
   - `Smoke check production URLs`

## Legacy `staging` Branch

The active staging branch is `develop`.

The old remote `staging` branch is no longer part of the workflow and should be
treated as deprecated history only. New work and PRs should use `develop`,
`feature/*`, and `hotfix/*`.
