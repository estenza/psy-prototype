# внутри

Прототип главной страницы для анонимной платформы про психологические истории и поддержку. Проект собран на `Next.js`, `React` и `Tailwind CSS v4` и сейчас сфокусирован на чистом UI, понятной структуре и простой эволюции от mock-данных к реальному API.

## Установка и запуск

```bash
npm install
npm run dev
```

Приложение будет доступно на `http://localhost:3000`.

Полезные команды:

```bash
npm run lint
npm run build
```

## Структура проекта

```text
src/
  app/                        # entrypoints Next.js app router
  components/
    layout/                   # шапка, навигация, sidebar
    ui/                       # tooltip, иконки и базовые UI-кирпичики
  constants/                  # shared UI-константы вне конкретной feature
  features/
    feed/
      components/             # секция ленты и режимы отображения
      constants/              # feed-specific константы
      hooks/                  # feed-specific client state
      lib/                    # feed-specific adapters/helpers
      mocks/                  # mock API shape и подготовленные данные
      types.ts                # типы ленты
  lib/                        # небольшие shared helpers
  styles/                     # design tokens
  types/                      # только shared типы
```

## Ключевые решения

- `src/app/page.tsx` остаётся тонким и в основном собирает экран из layout-модулей и feature-секций.
- Вся логика и модели ленты сгруппированы внутри `src/features/feed`, чтобы feature было проще читать и переносить.
- Mock-данные и адаптер оставлены раздельно:
  - `src/features/feed/mocks/mock-api-posts.ts` — сырой mock API shape
  - `src/features/feed/lib/post-adapter.ts` — маппинг API -> UI model
  - `src/features/feed/mocks/mock-posts.ts` — готовые данные для интерфейса
- Такая связка немного многословнее, но сохраняет готовность к подключению реального API без переписывания UI-модели.
- Design tokens вынесены в `src/styles/tokens.css`, а глобальные utility-классы оставлены в `src/app/globals.css`.
- Сортировка и переключение вида управляются из feed state, поэтому toolbar меняет не только UI-контролы, но и порядок/представление ленты.

## Архитектурные принципы

- Без лишних абстракций: только те слои, которые реально помогают читать и менять код.
- Компоненты по возможности презентационные.
- Feature-логика сгруппирована по домену.
- Shared helpers и shared типы не привязаны к конкретному экрану.
- Цвета и повторяемые UI-примитивы централизованы, а не размазаны по JSX.

## Что менять чаще всего

- Основная страница: `src/app/page.tsx`
- Layout: `src/components/layout/*`
- Лента: `src/features/feed/components/*`
- Состояние ленты: `src/features/feed/hooks/use-feed.ts`
- Mock-данные: `src/features/feed/mocks/*`
- Адаптер данных: `src/features/feed/lib/post-adapter.ts`
- Токены: `src/styles/tokens.css`
- Shared типы: `src/types/*`

## Ограничения текущего прототипа

- Сейчас реализован только главный экран.
- Навигация и часть shell-элементов пока служат UI-контекстом для прототипа, а не полноценной маршрутизацией.
- Данные ленты локальные, но их shape уже подготовлен для перехода к API.

## Текущее состояние качества

- `any` в проекте не используется.
- ESLint уже настроен и используется как базовая проверка качества.
- Prettier отдельно не добавлялся, чтобы не усложнять стек без явной необходимости.
