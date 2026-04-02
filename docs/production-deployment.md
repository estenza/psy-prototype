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
