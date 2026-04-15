import { Badge } from "@heroui/react";
import { POST_INTENT_META } from "@/constants/post-taxonomy";
import type { PostIntent } from "@/types/post-taxonomy";

type IntentBadgeProps = {
  intent: PostIntent;
};

export function IntentBadge({ intent }: IntentBadgeProps) {
  const color = intent === "support" ? "success" : "accent";

  return (
    <Badge color={color} variant="soft">
      {POST_INTENT_META[intent].badgeLabel}
    </Badge>
  );
}
