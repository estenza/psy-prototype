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
- Production workflow: `.github/workflows/deploy-production.yml`
  - branch trigger: `main`
  - GitHub Environment: `production`
  - required secret: `YC_SA_JSON_CREDENTIALS`

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
7. Open or create the `production` environment
8. Open `Secrets and variables` -> `Actions`
9. Add a secret named `YC_SA_JSON_CREDENTIALS`

## What Value To Put In The Secret

Use the full Yandex Cloud authorized key JSON for service account:

- `ajeh4qnls5se5raj12ua`

The JSON should be the full authorized key object, not just a token, not a
service account ID, and not a path to a file.

For now, the fastest practical setup is to use the same service account JSON in
both environments. If you later want stricter separation, you can switch to
separate service accounts while keeping the same secret name per environment.

## One-Time GitHub Setup Still Required

1. Create GitHub Environment `staging`
2. Add environment secret `YC_SA_JSON_CREDENTIALS` to `staging`
3. Create GitHub Environment `production`
4. Add environment secret `YC_SA_JSON_CREDENTIALS` to `production`
5. Optionally restrict deployment branches in GitHub Environments:
   - `staging` environment -> `develop`
   - `production` environment -> `main`
6. Protect `main` from direct pushes
7. Optionally protect `develop` as well

## Expected Result After Setup

- push to `develop` -> staging build/push/deploy
- push to `main` -> production build/push/deploy

If the secret is missing, the workflows fail fast at:

- `Validate Yandex auth secret`

That is the current expected failure mode until the environment secrets are
added.

## Verification Checklist

For staging:

1. Add `YC_SA_JSON_CREDENTIALS` to GitHub `Settings -> Environments -> staging -> Secrets and variables -> Actions`
2. Push a commit to `develop`
3. Open the `Deploy Staging` run in GitHub Actions
4. Confirm these steps pass:
   - `Validate Yandex auth secret`
   - `Authenticate Docker to Yandex Container Registry`
   - `Build and push linux/amd64 staging image`
   - `Deploy new staging Serverless Container revision`
   - `Smoke check staging URL`

For production:

1. Add `YC_SA_JSON_CREDENTIALS` to GitHub `Settings -> Environments -> production -> Secrets and variables -> Actions`
2. Push or merge a commit to `main`
3. Open the `Deploy Production` run in GitHub Actions
4. Confirm these steps pass:
   - `Validate Yandex auth secret`
   - `Authenticate Docker to Yandex Container Registry`
   - `Build and push linux/amd64 image`
   - `Deploy new Serverless Container revision`
   - `Smoke check production URLs`

## Legacy `staging` Branch

The active staging branch is `develop`.

The old remote `staging` branch is no longer part of the workflow and should be
treated as deprecated history only. New work and PRs should use `develop`,
`feature/*`, and `hotfix/*`.
