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

The recommended Git branch strategy for how changes reach `main` is documented
in [branch-workflow.md](./branch-workflow.md).

Shared GitHub Actions setup instructions live in
[github-actions-deploy-setup.md](./github-actions-deploy-setup.md).

Behavior:

- Trigger: every push to `main`
- Auth: `YC_SA_JSON_CREDENTIALS` from the `production` GitHub Environment
- Build: Docker Buildx builds `linux/amd64`
- Push: image is pushed to `cr.yandex/crphtumcsi9us93u61ir/psy:latest`
- Deploy: a new revision is deployed to `psy-container`
- Runtime env: `APP_ENV=production` and `AUTH_APP_URL=https://vnutri.live`
- Verify: the workflow runs HTTP smoke checks against
  `https://vnutri.live` and `https://www.vnutri.live`

### Required GitHub Secrets

Create a GitHub Environment named `production` and add:

- `YC_SA_JSON_CREDENTIALS`
  Yandex Cloud authorized key JSON for service account `ajeh4qnls5se5raj12ua`

Routine production deploys should go through GitHub Actions. The local
`scripts/deploy-production.sh` flow is only an emergency fallback.
