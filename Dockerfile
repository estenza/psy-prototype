FROM node:22-alpine

WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./

RUN corepack enable && yarn install

COPY . .

# Next.js asks Yarn for `registry`, but Yarn 4 exposes `npmRegistryServer`.
RUN mkdir -p /usr/local/share/yarn-wrapper && \
    printf '%s\n' \
      '#!/bin/sh' \
      'if [ "$1" = "config" ] && [ "$2" = "get" ] && [ "$3" = "registry" ]; then' \
      '  exec corepack yarn config get npmRegistryServer' \
      'fi' \
      'exec corepack yarn "$@"' \
      > /usr/local/share/yarn-wrapper/yarn && \
    chmod +x /usr/local/share/yarn-wrapper/yarn

ENV PATH=/usr/local/share/yarn-wrapper:$PATH

# Keep build-time auth access away from /app/data so mutable SQLite state
# never gets baked into the runtime image by accident.
RUN AUTH_DATABASE_PATH=/tmp/psy-build-auth.db yarn build && rm -f /tmp/psy-build-auth.db

ENV NODE_ENV=production

EXPOSE 3000

CMD ["yarn", "start"]
