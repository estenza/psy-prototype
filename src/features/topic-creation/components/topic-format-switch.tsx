import { TOPIC_FORMAT_META, TOPIC_FORMAT_OPTIONS } from "@/features/topic-creation/constants";
import type { TopicFormat } from "@/features/topic-creation/types";

type TopicFormatSwitchProps = {
  onChange: (nextFormat: TopicFormat) => void;
  value: TopicFormat;
};

export function TopicFormatSwitch({
  onChange,
  value,
}: TopicFormatSwitchProps) {
  const selectedFormat = TOPIC_FORMAT_META[value];

  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex flex-wrap gap-2"
        role="radiogroup"
        aria-label="Формат публикации"
      >
        {TOPIC_FORMAT_OPTIONS.map((format) => {
          const option = TOPIC_FORMAT_META[format];
          const isSelected = format === value;

          return (
            <button
              key={format}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(format)}
              className={`inline-flex min-w-0 items-center rounded-full px-3.5 py-2 text-left transition-[color,background-color,transform] duration-200 ease-out ${
                isSelected
                  ? "bg-[color-mix(in_oklab,var(--accent-primary)_12%,transparent)] text-[var(--accent-primary)] hover:bg-[color-mix(in_oklab,var(--accent-primary)_16%,transparent)] data-[hovered=true]:bg-[color-mix(in_oklab,var(--accent-primary)_16%,transparent)] active:bg-[color-mix(in_oklab,var(--accent-primary)_20%,transparent)] data-[pressed=true]:bg-[color-mix(in_oklab,var(--accent-primary)_20%,transparent)] active:text-[var(--accent-primary)] data-[pressed=true]:text-[var(--accent-primary)] active:scale-[0.97] data-[pressed=true]:scale-[0.97]"
                  : "bg-[color-mix(in_oklab,var(--foreground)_5%,transparent)] text-[var(--label-secondary)] hover:bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)] data-[hovered=true]:bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)] active:bg-[color-mix(in_oklab,var(--foreground)_11%,transparent)] data-[pressed=true]:bg-[color-mix(in_oklab,var(--foreground)_11%,transparent)] active:text-[var(--label-primary)] data-[pressed=true]:text-[var(--label-primary)] active:scale-[0.97] data-[pressed=true]:scale-[0.97]"
              }`.trim()}
            >
              <span
                className={`block pl-1 text-[14px] leading-5 font-medium ${
                  isSelected
                    ? "text-[var(--accent-primary)]"
                    : "text-[var(--label-tertiary)]"
                }`.trim()}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>

      <p className="pl-1 text-[14px] leading-5 text-[var(--label-tertiary)] transition-opacity duration-200 ease-out">
        {selectedFormat.description}
      </p>
    </div>
  );
}
