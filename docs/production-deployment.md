# Production Deployment Note

## Current Infrastructure

- Container name: `psy-container`
- Container id: `bbalp9df2q9b56tqigvp`
- Gateway name: `psy-gateway`
- Gateway id: `d5dqi918kcelngt3lkeu`
- Gateway spec snapshot: `infra/api-gateway/psy-gateway.openapi.yaml`
- Registry name: `psy-registry`
- Registry id: `crphtumcsi9us93u61ir`
- Image: `cr.yandex/crphtumcsi9us93u61ir/psy:latest`
- Certificate id: `fpq9amocodok2u2kttnn`
- Service account name: `psy-sa`
- Service account id: `ajeh4qnls5se5raj12ua`
- Production URLs:
  - `https://vnutri.live`
  - `https://www.vnutri.live`

## Current Redirect Behavior

`www.vnutri.live` is redirected permanently to `https://vnutri.live` in `next.config.ts` using a host-based Next.js redirect. This keeps the existing Yandex Cloud API Gateway and certificate setup intact while enforcing a single canonical host.

## Exact Deploy Commands Used

```bash
yc container registry configure-docker

docker buildx build \
  --platform linux/amd64 \
  -t cr.yandex/crphtumcsi9us93u61ir/psy:latest \
  --push .

yc serverless container revision deploy \
  --container-name psy-container \
  --image cr.yandex/crphtumcsi9us93u61ir/psy:latest \
  --cores 1 \
  --memory 512MB \
  --concurrency 8 \
  --execution-timeout 30s \
  --service-account-id ajeh4qnls5se5raj12ua
```

## Repeatable Redeploy

Use `./scripts/deploy-production.sh`.

It rebuilds the Linux AMD64 image, pushes it to the current Yandex Container Registry, deploys a new Serverless Container revision, and runs quick HTTPS smoke checks against both production hostnames.

## GitHub Actions Auto-Deploy

Production auto-deploy is defined in
`.github/workflows/deploy-production.yml`.

Behavior:

- Trigger: every push to `main`
- Auth: GitHub OIDC -> Yandex Cloud Workload Identity Federation
- Build: Docker Buildx builds `linux/amd64`
- Push: image is pushed to `cr.yandex/crphtumcsi9us93u61ir/psy:latest`
- Deploy: a new revision is deployed to `psy-container`
- Verify: the workflow runs HTTP smoke checks against
  `https://vnutri.live` and `https://www.vnutri.live`

### Required GitHub Secrets

No GitHub secrets are required for Yandex Cloud authentication in the
committed workflow. It uses GitHub OIDC with Workload Identity Federation
instead of a long-lived static cloud key.

### One-Time GitHub/Yandex Cloud Setup

Before the workflow can deploy, you need to connect this GitHub repository
to Yandex Cloud Workload Identity Federation:

1. In Yandex Cloud, create an OIDC Workload Identity Federation for GitHub Actions.
2. Bind the existing service account `ajeh4qnls5se5raj12ua` to that federation.
3. Add an access rule that allows tokens only from this repository and the
   `main` branch.
   Recommended subject pattern:
   `repo:<github-owner>/<github-repo>:ref:refs/heads/main`
4. Add a separate rule for the `staging` branch as well if you use the staging workflow:
   `repo:<github-owner>/<github-repo>:ref:refs/heads/staging`
5. Make sure GitHub Actions are enabled for the repository.

The workflow already requests the GitHub permission needed for OIDC:

- `id-token: write`
- `contents: read`

### Why No Secret Is Stored In GitHub

This is safer than storing a Yandex Cloud service account key in GitHub
Secrets:

- GitHub issues a short-lived OIDC token per workflow run
- Yandex Cloud exchanges it for a short-lived IAM token
- there is no long-lived cloud credential stored in the repo
