#!/usr/bin/env bash

set -euo pipefail

REGISTRY_ID="${REGISTRY_ID:-crphtumcsi9us93u61ir}"
REGISTRY_NAME="${REGISTRY_NAME:-psy-registry}"
IMAGE_NAME="${IMAGE_NAME:-psy}"
IMAGE_TAG="${IMAGE_TAG:-staging}"
CONTAINER_NAME="${CONTAINER_NAME:-psy-staging-container}"
SERVICE_ACCOUNT_ID="${SERVICE_ACCOUNT_ID:-ajeh4qnls5se5raj12ua}"
STAGING_GATEWAY_URL="${STAGING_GATEWAY_URL:-https://d5d6qfoc60m48deqn2q7.l3hh3szr.apigw.yandexcloud.net}"
STAGING_APP_URL="${STAGING_APP_URL:-https://staging.vnutri.live}"
HYVOR_TALK_WEBSITE_ID="${HYVOR_TALK_WEBSITE_ID:-15244}"

IMAGE="cr.yandex/${REGISTRY_ID}/${IMAGE_NAME}:${IMAGE_TAG}"

ENV_VARS=(
  "APP_ENV=staging"
  "AUTH_APP_URL=${STAGING_APP_URL}"
  "AUTH_DATABASE_PATH=/tmp/psy-staging.db"
  "HYVOR_TALK_WEBSITE_ID=${HYVOR_TALK_WEBSITE_ID}"
)

for optional_name in \
  HYVOR_TALK_DATA_API_KEY \
  HYVOR_TALK_CONSOLE_API_KEY \
  AUTH_EMAIL_FROM \
  AUTH_SMTP_HOST \
  AUTH_SMTP_PORT \
  AUTH_SMTP_SECURE \
  AUTH_SMTP_USERNAME \
  AUTH_SMTP_PASSWORD \
  AUTH_SMTP_HELO_HOST; do
  if [ -n "${!optional_name:-}" ]; then
    ENV_VARS+=("${optional_name}=${!optional_name}")
  fi
done

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
  --service-account-id "${SERVICE_ACCOUNT_ID}" \
  --environment "$(IFS=,; echo "${ENV_VARS[*]}")"

echo
echo "Smoke checks"
curl -I "${STAGING_GATEWAY_URL}"
