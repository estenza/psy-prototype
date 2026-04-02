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

## Where To Add The Secret In GitHub

Add the secret as an environment secret, not a repository secret.

GitHub path:

1. Open the repository on GitHub
2. Go to `Settings`
3. Go to `Environments`
4. Open or create the `staging` environment
5. Add a secret named `YC_SA_JSON_CREDENTIALS`
6. Open or create the `production` environment
7. Add a secret named `YC_SA_JSON_CREDENTIALS`

## What Value To Put In The Secret

Use the full Yandex Cloud authorized key JSON for service account:

- `ajeh4qnls5se5raj12ua`

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

## Legacy `staging` Branch

Safest recommendation:

- keep the old remote `staging` branch temporarily as a frozen legacy branch
- do not use it for new work
- switch all active work and PRs to `develop`
- delete remote `staging` after the team has fully switched and branch
  protections/default PR targets are updated

This avoids accidental disruption during the transition while still removing the
old branch from the active workflow.
