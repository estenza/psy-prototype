import {
  DEFAULT_POST_SUBTOPIC,
  POST_TOPIC_OPTIONS,
  POST_TOPIC_SUBTOPICS,
} from "@/constants/post-taxonomy";

export const SPECIALIST_WORK_TOPIC_GROUPS = POST_TOPIC_OPTIONS.map((topic) => ({
  label: topic.label,
  subtopics: (POST_TOPIC_SUBTOPICS[topic.value] ?? []).filter(
    (subtopic) => subtopic !== DEFAULT_POST_SUBTOPIC,
  ),
})).filter((topicGroup) => topicGroup.subtopics.length > 0);

export const SPECIALIST_WORK_TOPIC_OPTIONS = SPECIALIST_WORK_TOPIC_GROUPS.flatMap(
  (topicGroup) => topicGroup.subtopics,
);

const SPECIALIST_WORK_TOPIC_SET = new Set(SPECIALIST_WORK_TOPIC_OPTIONS);

export function normalizeSpecialistWorkTopics(input: string[] | null | undefined) {
  const seenValues = new Set<string>();

  return (input ?? []).reduce<string[]>((normalizedValues, value) => {
    const trimmedValue = value.trim();

    if (!SPECIALIST_WORK_TOPIC_SET.has(trimmedValue) || seenValues.has(trimmedValue)) {
      return normalizedValues;
    }

    seenValues.add(trimmedValue);
    normalizedValues.push(trimmedValue);

    return normalizedValues;
  }, []);
}

export function parseSpecialistWorkTopicsJson(value: string | null | undefined) {
  if (!value?.trim()) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return normalizeSpecialistWorkTopics(
      parsed.filter((item): item is string => typeof item === "string"),
    );
  } catch {
    return [];
  }
}
