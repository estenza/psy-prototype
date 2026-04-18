import { POST_TOPIC_META } from "@/constants/post-taxonomy";
import type { PostTopic } from "@/types/post-taxonomy";

type TopicLabelProps = {
  topic: PostTopic;
};

export function TopicLabel({ topic }: TopicLabelProps) {
  return (
    <span className="type-body-md text-label-tertiary inline-flex items-center">
      {POST_TOPIC_META[topic].label}
    </span>
  );
}
