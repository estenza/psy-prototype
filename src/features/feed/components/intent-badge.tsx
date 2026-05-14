import { Chip } from "@heroui/react";
import { POST_INTENT_META } from "@/constants/post-taxonomy";
import type { UserSummary } from "@/types/user";
import type { PostIntent } from "@/types/post-taxonomy";

type IntentBadgeProps = {
  authorRole?: UserSummary["role"];
  intent: PostIntent;
};

export function IntentBadge({ authorRole, intent }: IntentBadgeProps) {
  if (authorRole === "specialist") {
    return null;
  }

  const color = intent === "support" ? "success" : "accent";

  return (
    <Chip color={color} size="sm" variant="soft">
      {POST_INTENT_META[intent].badgeLabel}
    </Chip>
  );
}
