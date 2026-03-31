import type { CSSProperties } from "react";
import { POST_INTENT_META } from "@/constants/post-taxonomy";
import type { PostIntent } from "@/types/post-taxonomy";

type IntentBadgeProps = {
  intent: PostIntent;
};

export function IntentBadge({ intent }: IntentBadgeProps) {
  const accentName = intent === "support" ? "success" : "primary";
  const badgeStyle: CSSProperties = {
    backgroundColor: `color-mix(in srgb, var(--accent-${accentName}) 16%, transparent)`,
    color: `color-mix(in srgb, var(--accent-${accentName}) 82%, var(--label-primary))`,
  };

  return (
    <span
      style={badgeStyle}
      className="inline-flex items-center rounded-full px-3 py-1 text-[14px] font-normal leading-5"
    >
      <span>{POST_INTENT_META[intent].badgeLabel}</span>
    </span>
  );
}
