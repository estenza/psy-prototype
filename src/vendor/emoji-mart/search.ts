/*
 * Adapted from missive/emoji-mart
 * Sources:
 * - packages/emoji-mart/src/helpers/search-index.ts
 * - packages/emoji-mart/src/config.ts
 * License: MIT, see src/vendor/emoji-mart/LICENSE
 */

export type EmojiMartSearchEntry = {
  id: string;
  keywords: string[];
  label: string;
  native: string;
  searchText?: string;
};

function toSearchParts(value: string) {
  return value
    .toLowerCase()
    .replace(/(\w)-/, "$1 ")
    .split(/[\s|,]+/)
    .filter((word, index, words) => word.trim() && words.indexOf(word) === index);
}

export function buildEmojiMartSearchText(entry: EmojiMartSearchEntry) {
  return (
    "," +
    [
      [entry.id, false],
      [entry.label, true],
      [entry.keywords, false],
      [entry.native, false],
    ]
      .map(([strings, split]) => {
        if (!strings) {
          return [];
        }

        return (Array.isArray(strings) ? strings : [strings])
          .map((string) => {
            const normalized = String(string).toLowerCase();
            return split ? normalized.split(/[-|_|\s]+/) : [normalized];
          })
          .flat();
      })
      .flat()
      .filter((part) => part && part.trim())
      .join(",")
  );
}

export function searchEmojiMartEntries<T extends EmojiMartSearchEntry>(
  entries: T[],
  value: string,
  maxResults = 90,
) {
  if (!value.trim().length) {
    return [];
  }

  const terms = toSearchParts(value);

  if (!terms.length) {
    return [];
  }

  let pool = entries;
  let results: T[] = [];
  let scores = new Map<string, number>();

  for (const term of terms) {
    if (!pool.length) {
      break;
    }

    results = [];
    scores = new Map<string, number>();

    for (const entry of pool) {
      const searchText = entry.searchText ?? buildEmojiMartSearchText(entry);
      const score = searchText.indexOf(`,${term}`);

      if (score === -1) {
        continue;
      }

      results.push(entry);
      scores.set(entry.id, (scores.get(entry.id) ?? 0) + (entry.id === term ? 0 : score + 1));
    }

    pool = results;
  }

  if (results.length < 2) {
    return results;
  }

  return results
    .slice()
    .sort((entryA, entryB) => {
      const scoreA = scores.get(entryA.id) ?? Number.MAX_SAFE_INTEGER;
      const scoreB = scores.get(entryB.id) ?? Number.MAX_SAFE_INTEGER;

      if (scoreA === scoreB) {
        return entryA.id.localeCompare(entryB.id);
      }

      return scoreA - scoreB;
    })
    .slice(0, maxResults);
}
