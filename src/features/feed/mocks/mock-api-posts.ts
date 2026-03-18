import type { ApiPostRecord } from "@/types/feed";

function makePlaceholderDataUri() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
      <rect width="1200" height="720" fill="#e7e7e7" />
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const mockApiPosts: ApiPostRecord[] = [
  {
    id: "nika-feeling-left-out",
    author: {
      display_name: "Ника",
      username: "@nikatells",
    },
    timeline: {
      published_at_label: "14 мин назад",
      last_comment_at_label: "2 мин назад",
      last_comment_author: "lina.day",
    },
    body: {
      title: "Чувствую себя лишней даже среди близких",
      excerpt:
        "В компании друзей я шучу и поддерживаю всех, но внутри постоянно есть ощущение, что я там лишняя. Ночью из-за этого хочется удалить чаты и ни с кем не начинать разговор первой.",
    },
    counters: {
      comments: 18,
      likes: 41,
    },
    viewer_state: {
      liked: false,
      bookmarked: false,
    },
  },
  {
    id: "mira-breakup",
    author: {
      display_name: "Mira",
      username: "@mira.out",
    },
    timeline: {
      published_at_label: "32 мин назад",
      last_comment_at_label: "5 мин назад",
      last_comment_author: "toma.m",
    },
    body: {
      title: "После расставания не могу вернуться к себе",
      excerpt:
        "Прошло три месяца, а я как будто все еще живу в режиме ожидания. Пытаюсь занять себя учебой и работой, но вечером снова накрывает и хочется написать первой.",
      media: {
        kind: "image",
        url: makePlaceholderDataUri(),
        alt_text: "Плейсхолдер изображения для поста",
      },
    },
    counters: {
      comments: 27,
      likes: 58,
    },
    viewer_state: {
      liked: false,
      bookmarked: false,
    },
  },
  {
    id: "levi-burnout",
    author: {
      display_name: "levi",
      username: "@levi.day",
    },
    timeline: {
      published_at_label: "1 ч назад",
      last_comment_at_label: "11 мин назад",
      last_comment_author: "sonya.hold",
    },
    body: {
      title: "Боюсь, что выгорел в 24 и уже поздно что-то менять",
      excerpt:
        "Работа нормальная, команда хорошая, но каждое утро начинается с тяжести. Особенно пугает мысль, что со стороны у меня все в порядке, а внутри пусто и сил нет даже на любимые вещи.",
    },
    counters: {
      comments: 13,
      likes: 36,
    },
    viewer_state: {
      liked: false,
      bookmarked: false,
    },
  },
  {
    id: "sasha-therapy-shame",
    author: {
      display_name: "sasha",
      username: "@sasha.anon",
    },
    timeline: {
      published_at_label: "2 ч назад",
      last_comment_at_label: "18 мин назад",
      last_comment_author: "anna.reply",
    },
    body: {
      title: "Стыдно идти к психологу, хотя понимаю, что уже пора",
      excerpt:
        "Я легко советую друзьям обратиться за помощью, но сама как будто думаю, что должна справиться без специалиста. Мешают страх оценки и мысль, что мои проблемы недостаточно серьезные.",
    },
    counters: {
      comments: 34,
      likes: 62,
    },
    viewer_state: {
      liked: false,
      bookmarked: false,
    },
  },
];
