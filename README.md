# внутри

`внутри` — это Next.js-приложение для анонимных психологических историй и
поддержки. В репозитории уже есть живая production-среда, отдельный staging,
базовый auth-флоу, восстановление пароля, профиль после регистрации и UI для
основных пользовательских экранов.

## Что сейчас в проекте

- главная лента на `src/app/page.tsx`
- регистрация и вход
- восстановление пароля по email
- шаг завершения профиля после первого входа
- создание новой темы
- staging и production deploy через GitHub Actions

## Стек

- Next.js 16
- React 19
- Tailwind CSS 4
- TypeScript
- SQLite локально и PostgreSQL-ready auth storage для cloud deploy
- Yandex Cloud Serverless Container + API Gateway для staging и production

## Быстрый старт

Проект использует `yarn@4`.

```bash
corepack enable
yarn install
yarn dev
```

Приложение будет доступно на `http://localhost:3000`.

Полезные команды:

```bash
yarn lint
yarn build
yarn start
```

## Переменные окружения

Локально приложение может работать почти без настройки, но для полного auth и
почтового флоу полезны такие переменные:

```bash
AUTH_APP_URL=http://localhost:3000
AUTH_DATABASE_PATH=./data/app.db
AUTH_DATABASE_URL=postgresql://user:password@host:6432/database
AUTH_DATABASE_SSL=false
AUTH_EMAIL_FROM=no-reply@vnutri.live
AUTH_SMTP_HOST=smtp.example.com
AUTH_SMTP_PORT=587
AUTH_SMTP_SECURE=false
AUTH_SMTP_USERNAME=login
AUTH_SMTP_PASSWORD=secret
AUTH_SMTP_HELO_HOST=vnutri.live
```

Примечания:

- если `AUTH_DATABASE_PATH` не задан, локально используется `data/app.db`
- если задан `AUTH_DATABASE_URL`, auth-данные идут через PostgreSQL вместо SQLite
- staging и production не должны работать на SQLite fallback внутри контейнера
- если SMTP не настроен и приложение не в production, reset-password API
  возвращает debug-ссылку вместо реальной отправки письма
- staging и production задают свои runtime env через GitHub Actions deploy

## Окружения

- production: `https://vnutri.live`
- staging: `https://staging.vnutri.live`

Визуальные отличия staging управляются только через `APP_ENV=staging`, а не
через название ветки или домен в коде компонента.

## Ветки и релизы

Репозиторий переведён на простой рабочий flow:

- `main` -> production
- `develop` -> staging
- `feature/*` -> PR в `develop`
- `hotfix/*` -> PR в `main`, потом merge обратно в `develop`

Обычный путь релиза:

1. делать работу в `feature/*`
2. мерджить в `develop`
3. проверять на staging
4. продвигать в production PR-ом `develop -> main`

Это позволяет смотреть всё на staging заранее и легко не тянуть неудачные
эксперименты в production.

## GitHub Actions Deploy

Оба deploy workflow используют один и тот же auth path:

- GitHub Environment secret `YC_SA_JSON_CREDENTIALS`
- `develop` workflow читает его из environment `staging`
- `main` workflow читает его из environment `production`
- production workflow дополнительно требует `AUTH_DATABASE_URL`
- Hyvor и SMTP runtime env тоже должны жить в GitHub Environments, а не в `.env.local` внутри Docker image

Для нормальной работы нужно один раз настроить environment secrets в GitHub.
Подробности ниже в документации.

## Документация

- [Branch workflow](./docs/branch-workflow.md)
- [GitHub Actions deploy setup](./docs/github-actions-deploy-setup.md)
- [Auth storage migration](./docs/auth-storage-migration.md)
- [Staging deployment](./docs/staging-deployment.md)
- [Production deployment](./docs/production-deployment.md)

## Структура проекта

```text
src/
  app/                        # routes и app router entrypoints
  components/
    layout/                   # shell, header, nav, sidebars
    ui/                       # общие UI-примитивы
  constants/                  # shared константы
  features/
    auth/                     # регистрация, вход, reset password, profile flow
    comments/                 # комментарии и связанный UI/state
    discussions/              # создание и просмотр тем
    feed/                     # лента и её состояние
  lib/                        # shared helpers, db, env helpers
  styles/                     # design tokens
  types/                      # shared типы
docs/                         # workflow и deploy документация
scripts/                      # fallback deploy scripts
infra/                        # инфраструктурные артефакты Yandex Cloud
```

## Что менять чаще всего

- страницы и маршруты: `src/app/*`
- auth: `src/features/auth/*`
- лента: `src/features/feed/*`
- обсуждения: `src/features/discussions/*`
- layout и shell: `src/components/layout/*`
- deploy docs и workflow: `docs/*`, `.github/workflows/*`

## Текущее качество и ограничения

- `yarn lint` используется как базовая проверка
- staging и production уже существуют, но GitHub environment secrets должны
  быть настроены для полностью автоматических deploy
- локальные deploy scripts сохранены только как аварийный fallback, а не как
  основной путь релиза
