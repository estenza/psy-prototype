#!/usr/bin/env bash

set -euo pipefail

REGISTRY_ID="${REGISTRY_ID:-crphtumcsi9us93u61ir}"
REGISTRY_NAME="${REGISTRY_NAME:-psy-registry}"
IMAGE_NAME="${IMAGE_NAME:-psy}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
CONTAINER_NAME="${CONTAINER_NAME:-psy-container}"
SERVICE_ACCOUNT_ID="${SERVICE_ACCOUNT_ID:-ajeh4qnls5se5raj12ua}"

IMAGE="cr.yandex/${REGISTRY_ID}/${IMAGE_NAME}:${IMAGE_TAG}"

echo "Using registry ${REGISTRY_NAME} (${REGISTRY_ID})"
echo "Building and pushing ${IMAGE}"

yc container registry configure-docker

docker buildx build \
  --platform linux/amd64 \
  -t "${IMAGE}" \
  --push .

echo "Deploying ${IMAGE} to ${CONTAINER_NAME}"

yc serverless container revision deploy \
  --container-name "${CONTAINER_NAME}" \
  --image "${IMAGE}" \
  --cores 1 \
  --memory 512MB \
  --concurrency 8 \
  --execution-timeout 30s \
  --service-account-id "${SERVICE_ACCOUNT_ID}"

echo
echo "Smoke checks"
curl -I https://vnutri.live
curl -I https://www.vnutri.live
