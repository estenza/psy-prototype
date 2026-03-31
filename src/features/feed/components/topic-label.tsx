import { POST_TOPIC_META } from "@/constants/post-taxonomy";
import type { PostTopic } from "@/types/post-taxonomy";

type TopicLabelProps = {
  topic: PostTopic;
};

export function TopicLabel({ topic }: TopicLabelProps) {
  return (
    <span className="text-label-tertiary inline-flex items-center text-[14px] font-normal leading-5">
      {POST_TOPIC_META[topic].label}
    </span>
  );
}
