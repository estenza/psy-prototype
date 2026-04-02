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

RUN yarn build

ENV NODE_ENV=production

EXPOSE 3000

CMD ["yarn", "start"]
