"use client";

import data from "@emoji-mart/data";
import { ScrollShadow } from "@heroui/react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  EmojiMartCategoryIcon,
  type EmojiMartCategoryId,
  EmojiMartSearchIcon,
} from "@/vendor/emoji-mart/icons";
import {
  buildEmojiMartSearchText,
  searchEmojiMartEntries,
  type EmojiMartSearchEntry,
} from "@/vendor/emoji-mart/search";

type CommentEmojiPickerProps = {
  onSelect: (emoji: string) => void;
};

type EmojiMartData = {
  categories: Array<{
    emojis: string[];
    id: string;
  }>;
  emojis: Record<
    string,
    {
      keywords?: string[];
      name: string;
      skins?: Array<{
        native: string;
      }>;
    }
  >;
};

type EmojiEntry = EmojiMartSearchEntry & {
  searchText: string;
};

type EmojiSection = {
  emojis: EmojiEntry[];
  id: string;
  label: string;
};

const COMMENT_EMOJI_PICKER_SCROLL_HEIGHT = 280;
const COMMENT_EMOJI_RECENT_STORAGE_KEY = "comment-emoji-picker:recent";
const COMMENT_EMOJI_RECENT_LIMIT = 32;
const EMOJI_DATA = data as EmojiMartData;
const EMOJI_CATEGORY_IDS = [
  "frequent",
  "people",
  "nature",
  "foods",
  "activity",
  "places",
  "objects",
  "symbols",
  "flags",
] as const satisfies readonly EmojiMartCategoryId[];

type EmojiCategoryId = (typeof EMOJI_CATEGORY_IDS)[number];

const CATEGORY_LABELS: Record<EmojiCategoryId, string> = {
  activity: "Активность",
  flags: "Флаги",
  foods: "Еда и напитки",
  frequent: "Недавние",
  nature: "Животные и природа",
  objects: "Объекты",
  people: "Эмоции и люди",
  places: "Путешествия и места",
  symbols: "Символы",
};

function createEmojiEntry(id: string): EmojiEntry | null {
  const emoji = EMOJI_DATA.emojis[id];
  const native = emoji?.skins?.[0]?.native;

  if (!emoji || !native) {
    return null;
  }

  const entry = {
    id,
    keywords: emoji.keywords ?? [],
    label: emoji.name,
    native,
  };

  return {
    ...entry,
    searchText: buildEmojiMartSearchText(entry),
  };
}

function loadRecentEmojiIds() {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  try {
    const storedValue = window.localStorage.getItem(COMMENT_EMOJI_RECENT_STORAGE_KEY);

    if (!storedValue) {
      return [];
    }

    const parsedValue = JSON.parse(storedValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

function saveRecentEmojiIds(emojiIds: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(COMMENT_EMOJI_RECENT_STORAGE_KEY, JSON.stringify(emojiIds));
  } catch {
    // Ignore storage write errors in private mode or restricted environments.
  }
}

function buildDefaultSections(recentEmojiIds: string[]) {
  return EMOJI_CATEGORY_IDS.map((categoryId) => {
    const emojiIds =
      categoryId === "frequent"
        ? recentEmojiIds
        : EMOJI_DATA.categories.find((category) => category.id === categoryId)?.emojis ?? [];

    return {
      emojis: emojiIds
        .map((emojiId) => createEmojiEntry(emojiId))
        .filter((emoji): emoji is EmojiEntry => emoji !== null),
      id: categoryId,
      label: CATEGORY_LABELS[categoryId],
    } satisfies EmojiSection;
  });
}

const SEARCHABLE_EMOJIS = Array.from(
  new Set(EMOJI_DATA.categories.flatMap((category) => category.emojis)),
)
  .map((emojiId) => createEmojiEntry(emojiId))
  .filter((emoji): emoji is EmojiEntry => emoji !== null);

export function CommentEmojiPicker({ onSelect }: CommentEmojiPickerProps) {
  const [query, setQuery] = useState("");
  const [recentEmojiIds, setRecentEmojiIds] = useState<string[]>(() => loadRecentEmojiIds());
  const [activeCategoryId, setActiveCategoryId] = useState<EmojiCategoryId>("frequent");
  const deferredQuery = useDeferredValue(query.trim());
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const pendingCategoryScrollRef = useRef<string | null>(null);

  const defaultSections = useMemo(
    () => buildDefaultSections(recentEmojiIds),
    [recentEmojiIds],
  );

  const isSearching = deferredQuery.length > 0;
  const searchResults = isSearching
    ? searchEmojiMartEntries(SEARCHABLE_EMOJIS, deferredQuery, 90)
    : [];
  const visibleSections = isSearching
    ? [
        {
          emojis: searchResults,
          id: "results",
          label: "Результаты",
        } satisfies EmojiSection,
      ]
    : defaultSections;
  const selectedCategoryIndex = isSearching ? -1 : EMOJI_CATEGORY_IDS.indexOf(activeCategoryId);

  function scrollToCategory(categoryId: EmojiCategoryId) {
    const scrollContainer = scrollContainerRef.current;
    const sectionElement = sectionRefs.current[categoryId];

    if (!scrollContainer || !sectionElement) {
      return;
    }

    const scrollContainerRect = scrollContainer.getBoundingClientRect();
    const sectionRect = sectionElement.getBoundingClientRect();
    const nextScrollTop = sectionRect.top - scrollContainerRect.top + scrollContainer.scrollTop;

    scrollContainer.scrollTop = nextScrollTop;
  }

  useEffect(() => {
    if (isSearching) {
      return;
    }

    const pendingCategoryId = pendingCategoryScrollRef.current;

    if (!pendingCategoryId) {
      return;
    }

    pendingCategoryScrollRef.current = null;

    requestAnimationFrame(() => {
      scrollToCategory(pendingCategoryId as EmojiCategoryId);
    });
  }, [isSearching]);

  function handleCategoryClick(categoryId: EmojiCategoryId) {
    setActiveCategoryId(categoryId);

    if (isSearching) {
      pendingCategoryScrollRef.current = categoryId;
      setQuery("");
      return;
    }

    scrollToCategory(categoryId);
  }

  function handleScroll() {
    if (!scrollContainerRef.current || isSearching) {
      return;
    }

    const scrollContainerRect = scrollContainerRef.current.getBoundingClientRect();
    let nearestCategoryId = activeCategoryId;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const section of defaultSections) {
      const element = sectionRefs.current[section.id];

      if (!element) {
        continue;
      }

      const distance = Math.abs(
        element.getBoundingClientRect().top - scrollContainerRect.top - 8,
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestCategoryId = section.id;
      }
    }

    if (nearestCategoryId !== activeCategoryId) {
      setActiveCategoryId(nearestCategoryId);
    }
  }

  function handleEmojiClick(emoji: EmojiEntry) {
    const nextRecentEmojiIds = [emoji.id, ...recentEmojiIds.filter((id) => id !== emoji.id)].slice(
      0,
      COMMENT_EMOJI_RECENT_LIMIT,
    );

    setRecentEmojiIds(nextRecentEmojiIds);
    saveRecentEmojiIds(nextRecentEmojiIds);
    onSelect(emoji.native);
  }

  return (
    <div className="surface-elevated flex w-full flex-col bg-white">
      <div className="border-separator border-b px-2">
        <nav aria-label="Категории эмодзи" className="relative flex">
          {EMOJI_CATEGORY_IDS.map((categoryId) => {
            const isActiveCategory = !isSearching && activeCategoryId === categoryId;

            return (
              <button
                key={categoryId}
                type="button"
                aria-label={CATEGORY_LABELS[categoryId]}
                title={CATEGORY_LABELS[categoryId]}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleCategoryClick(categoryId)}
                className="flex h-11 flex-1 items-center justify-center transition-colors"
              >
                <EmojiMartCategoryIcon
                  categoryId={categoryId}
                  className={`h-[18px] w-[18px] ${
                    isActiveCategory
                      ? "text-[var(--accent-primary)]"
                      : "text-[var(--label-secondary)]"
                  }`.trim()}
                />
              </button>
            );
          })}

          <div
            className="pointer-events-none absolute bottom-0 h-[2px] rounded-full bg-[var(--accent-primary)] transition-all duration-200 ease-out"
            style={{
              opacity: selectedCategoryIndex === -1 ? 0 : 1,
              transform: `translateX(${Math.max(selectedCategoryIndex, 0) * 100}%)`,
              width: `${100 / EMOJI_CATEGORY_IDS.length}%`,
            }}
          />
        </nav>
      </div>

      <div className="border-separator border-b px-3 py-3">
        <label className="surface-secondary border-separator flex h-10 items-center gap-2 rounded-[12px] border px-3 text-[var(--label-secondary)]">
          <EmojiMartSearchIcon className="h-4 w-4" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-[var(--label-primary)] outline-none placeholder:text-[var(--field-placeholder)]"
          />
        </label>
      </div>

      <ScrollShadow
        ref={scrollContainerRef}
        orientation="vertical"
        size={48}
        visibility="bottom"
        className="px-3 pb-3"
        style={{ maxHeight: COMMENT_EMOJI_PICKER_SCROLL_HEIGHT }}
        onScroll={handleScroll}
      >
        <div className="flex flex-col gap-4">
          {visibleSections.map((section) => (
            <section
              key={section.id}
              ref={(element) => {
                sectionRefs.current[section.id] = element;
              }}
              className="min-h-0"
            >
              <div
                className="sticky -top-px z-[1] -mx-1 px-1 py-2 text-[13px] font-medium text-[var(--label-secondary)]"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                  WebkitBackdropFilter: "blur(4px)",
                  backdropFilter: "blur(4px)",
                }}
              >
                {section.label}
              </div>

              {section.emojis.length > 0 ? (
                <div className="grid grid-cols-8 gap-1">
                  {section.emojis.map((emoji) => (
                    <button
                      key={emoji.id}
                      type="button"
                      aria-label={emoji.label}
                      title={emoji.label}
                      onClick={() => handleEmojiClick(emoji)}
                      className="flex h-9 w-9 items-center justify-center rounded-[10px] text-[24px] leading-none transition-colors hover:bg-[var(--color-accent-soft)]"
                    >
                      <span aria-hidden>{emoji.native}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="pb-2 pt-1 text-[14px] text-[var(--label-secondary)]">
                  {section.id === "frequent" ? "Пока нет недавних эмодзи." : "Ничего не найдено."}
                </div>
              )}
            </section>
          ))}
        </div>
      </ScrollShadow>
    </div>
  );
}
