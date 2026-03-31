import type { Post } from "@/features/feed/types";
import { IntentBadge } from "@/features/feed/components/intent-badge";
import { TopicLabel } from "@/features/feed/components/topic-label";

type PostContextBadgesProps = {
  intent: Post["intent"];
  topic?: Post["topic"];
  className?: string;
};

export function PostContextBadges({
  intent,
  topic,
  className = "",
}: PostContextBadgesProps) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 ${className}`.trim()}>
      <IntentBadge intent={intent} />
      {topic ? <TopicLabel topic={topic} /> : null}
    </div>
  );
}
