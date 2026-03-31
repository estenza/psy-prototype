import type { PostIntent } from "@/types/post-taxonomy";

type TopicFormatSwitchProps = {
  onChange: (nextMode: PostIntent) => void;
  value: PostIntent;
};

const TOPIC_FORMAT_OPTIONS: Record<
  PostIntent,
  { description: string; label: string }
> = {
  discussion: {
    label: "Узнать мнения",
    description:
      "Свободное обсуждение, в котором могут участвовать психологи и обычные пользователи",
  },
  support: {
    label: "Демо-консультация",
    description:
      "Более камерный формат, в котором можно описать ситуацию и получить бережный структурированный отклик.",
  },
};

export function TopicFormatSwitch({
  onChange,
  value,
}: TopicFormatSwitchProps) {
  return (
    <section className="space-y-4">
      <div className="inline-flex rounded-[16px] bg-[var(--fill-control-hover)] p-1">
        {(Object.keys(TOPIC_FORMAT_OPTIONS) as PostIntent[]).map(
          (mode) => {
            const isActive = mode === value;

            return (
              <button
                key={mode}
                type="button"
                onClick={() => onChange(mode)}
                className={`cursor-pointer rounded-[12px] px-6 py-3 text-left text-[14px] font-bold leading-5 transition-colors ${
                  isActive
                    ? "surface-elevated text-[var(--accent-primary)]"
                    : "text-label-tertiary"
                }`}
              >
                <span className="block">{TOPIC_FORMAT_OPTIONS[mode].label}</span>
              </button>
            );
          },
        )}
      </div>

      <p className="text-label-tertiary text-[14px] leading-5">
        {TOPIC_FORMAT_OPTIONS[value].description}
      </p>
    </section>
  );
}
