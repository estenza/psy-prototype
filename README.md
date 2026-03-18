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
  app/                  # entrypoints Next.js app router
  components/
    layout/             # шапка, навигация, sidebar
    ui/                 # tooltip, иконки и базовые UI-кирпичики
  constants/            # навигация, режимы ленты, UI-константы
  features/
    feed/
      components/       # режимы отображения ленты и feed-specific UI
      mocks/            # mock-данные для ленты
  hooks/                # client-side state hooks
  lib/                  # небольшие переиспользуемые helpers и adapters
  styles/               # design tokens
  types/                # доменные типы и UI-модели
```

## Ключевые решения

- `src/app/page.tsx` оставлен тонким и в основном собирает экран из модулей.
- Состояние ленты вынесено в `src/hooks/use-feed.ts`, поэтому UI-компоненты меньше завязаны на логику.
- Типы вынесены в `src/types`, чтобы они не жили внутри feature-компонентов.
- Моки и их адаптация разделены:
  - `src/features/feed/mocks/mock-api-posts.ts` — сырой mock API shape
  - `src/lib/post-adapter.ts` — маппинг API -> UI model
  - `src/features/feed/mocks/mock-posts.ts` — готовые данные для интерфейса
- Design tokens вынесены в `src/styles/tokens.css`, а глобальные utility-классы оставлены в `src/app/globals.css`.
- Иконки разделены по смыслу на несколько файлов, чтобы избежать одного большого `index.tsx`.

## Архитектурные принципы

- Без лишних абстракций: только те слои, которые реально помогают читать и менять код.
- Компоненты по возможности презентационные.
- Feature-логика сгруппирована по домену.
- Shared helpers и общие типы не привязаны к конкретному экрану.
- Цвета, режимы и навигация централизованы, а не размазаны по JSX.

## Что менять чаще всего

- Основная страница: `src/app/page.tsx`
- Layout: `src/components/layout/*`
- Лента и её режимы: `src/features/feed/components/*`
- Mock-данные: `src/features/feed/mocks/*`
- Токены: `src/styles/tokens.css`
- Типы: `src/types/*`

## Текущее состояние качества

- `any` в проекте не используется.
- ESLint уже настроен и используется как базовая проверка качества.
- Prettier отдельно не добавлялся, чтобы не усложнять стек без явной необходимости.
