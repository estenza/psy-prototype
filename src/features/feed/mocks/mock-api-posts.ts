import type { ApiPostRecord } from "@/features/feed/types";

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
    created_at_iso: "2026-03-20T11:46:00.000Z",
    intent: "support",
    topic: "social-situations",
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
      detail:
        "В компании друзей я часто выгляжу как человек, у которого всё в порядке: шучу, поддерживаю разговор, помогаю организовать встречи, первой замечаю, если кому-то стало грустно или некомфортно. Со стороны это, наверное, выглядит как лёгкость и уверенность, но внутри почти каждый раз остаётся очень болезненное ощущение, что я как будто случайно оказалась среди них и в любой момент меня могут “вычеркнуть”. Иногда я ловлю себя на том, что весь вечер сканирую чужие реакции: не слишком ли громко я сказала, не перебила ли кого-то, не было ли у людей выражения лица, будто меня просто терпят. После таких встреч возвращаюсь домой совершенно выжатой и ещё долго прокручиваю диалоги, вспоминая каждую мелочь. Самое тяжёлое начинается ночью: хочется удалить чаты, перестать первой писать и вообще исчезнуть до тех пор, пока кто-то сам не даст понять, что я действительно нужна. Понимаю, что это может быть не очень рационально, потому что объективно никто меня не отвергает, но эмоционально ощущение лишности всё равно сильнее любых фактов. Очень хочу понять, сталкивался ли кто-то с похожим состоянием и что вам помогало не проваливаться в это после общения.",
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
    created_at_iso: "2026-03-20T11:28:00.000Z",
    intent: "support",
    topic: "relationships",
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
    created_at_iso: "2026-03-20T11:00:00.000Z",
    intent: "discussion",
    topic: "work-money",
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
    created_at_iso: "2026-03-20T10:00:00.000Z",
    intent: "discussion",
    topic: "self-esteem",
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
  {
    id: "alina-mother-conflict",
    created_at_iso: "2026-03-20T09:26:00.000Z",
    intent: "support",
    topic: "family",
    author: {
      display_name: "Алина",
      username: "@alina.letters",
    },
    timeline: {
      published_at_label: "3 ч назад",
      last_comment_at_label: "34 мин назад",
      last_comment_author: "polya.sun",
    },
    body: {
      title: "После разговора с мамой чувствую вину и злость одновременно",
      excerpt:
        "Каждый раз, когда пытаюсь обозначить границы, разговор уходит в упрёки и чувство, будто я плохая дочь. Потом долго не могу успокоиться и начинаю сомневаться в себе.",
    },
    counters: {
      comments: 21,
      likes: 44,
    },
    viewer_state: {
      liked: false,
      bookmarked: false,
    },
  },
  {
    id: "roma-anxiety-evenings",
    created_at_iso: "2026-03-20T08:48:00.000Z",
    intent: "support",
    topic: "emotions",
    author: {
      display_name: "Рома",
      username: "@roma.ya",
    },
    timeline: {
      published_at_label: "4 ч назад",
      last_comment_at_label: "1 ч назад",
      last_comment_author: "tera.n",
    },
    body: {
      title: "К вечеру тревога резко усиливается, хотя днём всё терпимо",
      excerpt:
        "Днём могу отвлекаться на дела, а ближе к ночи накрывает телесной тревогой и мыслями, что я что-то упускаю. Не понимаю, как сделать вечера менее пугающими.",
    },
    counters: {
      comments: 16,
      likes: 29,
    },
    viewer_state: {
      liked: false,
      bookmarked: false,
    },
  },
  {
    id: "igor-routine-loss",
    created_at_iso: "2026-03-20T07:40:00.000Z",
    intent: "discussion",
    topic: "habits-addictions",
    author: {
      display_name: "Игорь",
      username: "@igor.h",
    },
    timeline: {
      published_at_label: "5 ч назад",
      last_comment_at_label: "2 ч назад",
      last_comment_author: "veta.inside",
    },
    body: {
      title: "Хочу убрать ночной скроллинг, но каждый раз срываюсь",
      excerpt:
        "Понимаю, что из-за телефона сплю по 4-5 часов и потом весь день разбит. Интересно услышать опыт тех, кто правда смог переломить этот цикл.",
    },
    counters: {
      comments: 9,
      likes: 22,
    },
    viewer_state: {
      liked: false,
      bookmarked: false,
    },
  },
  {
    id: "yana-grief-return",
    created_at_iso: "2026-03-20T06:35:00.000Z",
    intent: "support",
    topic: "crisis-loss",
    author: {
      display_name: "Яна",
      username: "@yana.slow",
    },
    timeline: {
      published_at_label: "6 ч назад",
      last_comment_at_label: "1 ч назад",
      last_comment_author: "liza.heart",
    },
    body: {
      title: "Через год после утраты стало снова очень тяжело",
      excerpt:
        "Казалось, что я постепенно выровнялась, но последние недели как будто возвращают в первые месяцы. Очень не хватает ощущения опоры и нормальности.",
    },
    counters: {
      comments: 31,
      likes: 55,
    },
    viewer_state: {
      liked: false,
      bookmarked: false,
    },
  },
];
