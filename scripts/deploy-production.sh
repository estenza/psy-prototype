#!/usr/bin/env bash

set -euo pipefail

REGISTRY_ID="${REGISTRY_ID:-crphtumcsi9us93u61ir}"
REGISTRY_NAME="${REGISTRY_NAME:-psy-registry}"
IMAGE_NAME="${IMAGE_NAME:-psy}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
CONTAINER_NAME="${CONTAINER_NAME:-psy-container}"
SERVICE_ACCOUNT_ID="${SERVICE_ACCOUNT_ID:-ajeh4qnls5se5raj12ua}"
NETWORK_ID="${NETWORK_ID:-enpgiiep4cceg1u2j18d}"
APP_URL="${APP_URL:-https://vnutri.live}"
HYVOR_TALK_WEBSITE_ID="${HYVOR_TALK_WEBSITE_ID:-15244}"

IMAGE="cr.yandex/${REGISTRY_ID}/${IMAGE_NAME}:${IMAGE_TAG}"

require_env() {
  local name="$1"

  if [ -z "${!name:-}" ]; then
    echo "Missing required environment variable: ${name}" >&2
    exit 1
  fi
}

require_env AUTH_DATABASE_URL
require_env DOMAIN_EVENTS_WORKER_SECRET
require_env HYVOR_TALK_DATA_API_KEY
require_env HYVOR_TALK_CONSOLE_API_KEY

ENV_VARS=(
  "APP_ENV=production"
  "AUTH_APP_URL=${APP_URL}"
  "AUTH_DATABASE_URL=${AUTH_DATABASE_URL}"
  "AUTH_DATABASE_SSL=${AUTH_DATABASE_SSL:-false}"
  "DOMAIN_EVENTS_WORKER_SECRET=${DOMAIN_EVENTS_WORKER_SECRET}"
  "HYVOR_TALK_WEBSITE_ID=${HYVOR_TALK_WEBSITE_ID}"
  "HYVOR_TALK_DATA_API_KEY=${HYVOR_TALK_DATA_API_KEY}"
  "HYVOR_TALK_CONSOLE_API_KEY=${HYVOR_TALK_CONSOLE_API_KEY}"
)

for optional_name in \
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
echo "Applying PostgreSQL migrations"
npm run migrate:auth:postgres:schema

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
  --network-id "${NETWORK_ID}" \
  --environment "$(IFS=,; echo "${ENV_VARS[*]}")"

echo
echo "Smoke checks"
curl -I https://vnutri.live
curl -I https://www.vnutri.live
