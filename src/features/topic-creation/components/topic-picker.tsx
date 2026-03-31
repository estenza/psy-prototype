import { useEffect, useRef, useState } from "react";
import { POST_TOPIC_OPTIONS } from "@/constants/post-taxonomy";
import { ChevronDownIcon } from "@/components/ui/icons";
import type { PostTopic } from "@/types/post-taxonomy";

type TopicPickerProps = {
  onChange: (nextTopic: PostTopic | null) => void;
  value: PostTopic | null;
};

export function TopicPicker({ onChange, value }: TopicPickerProps) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const selectedTopic = POST_TOPIC_OPTIONS.find((topic) => topic.value === value);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function handleSelect(nextTopic: PostTopic | null) {
    onChange(nextTopic);
    setOpen(false);
  }

  return (
    <div ref={pickerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="field-shell flex w-full cursor-pointer items-center justify-between rounded-[16px] px-4 py-4 text-left"
      >
        <span className="text-label-primary text-[16px] leading-6">
          {selectedTopic?.label ?? "Тема не выбрана"}
        </span>
        <span
          className={`text-label-primary flex-none transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          <ChevronDownIcon />
        </span>
      </button>

      {open ? (
        <div className="surface-primary border-separator absolute inset-x-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-[16px] border shadow-[0_12px_32px_rgba(0,0,0,0.08)]">
          <div className="max-h-[320px] overflow-y-auto py-2">
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={`flex w-full items-center px-4 py-3 text-left text-[16px] leading-6 transition-colors ${
                value === null
                  ? "bg-[var(--fill-control-hover)] text-label-primary"
                  : "text-label-primary hover:bg-[var(--fill-control-hover)]"
              }`}
            >
              Тема не выбрана
            </button>

            {POST_TOPIC_OPTIONS.map((topic) => {
              const isActive = topic.value === value;

              return (
                <button
                  key={topic.value}
                  type="button"
                  onClick={() => handleSelect(topic.value)}
                  className={`flex w-full items-center px-4 py-3 text-left text-[16px] leading-6 transition-colors ${
                    isActive
                      ? "bg-[var(--fill-control-hover)] text-label-primary"
                      : "text-label-primary hover:bg-[var(--fill-control-hover)]"
                  }`}
                >
                  {topic.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
