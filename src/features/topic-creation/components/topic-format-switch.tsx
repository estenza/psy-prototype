import { Description, Tabs } from "@heroui/react";
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
    <Tabs
      selectedKey={value}
      onSelectionChange={(key) => onChange(String(key) as PostIntent)}
    >
      <Tabs.ListContainer>
        <Tabs.List aria-label="Формат публикации">
          {(Object.keys(TOPIC_FORMAT_OPTIONS) as PostIntent[]).map((mode, index) => (
            <Tabs.Tab
              key={mode}
              id={mode}
            >
              {index > 0 ? <Tabs.Separator /> : null}
              {TOPIC_FORMAT_OPTIONS[mode].label}
              <Tabs.Indicator />
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>

      {(Object.keys(TOPIC_FORMAT_OPTIONS) as PostIntent[]).map((mode) => (
        <Tabs.Panel className="pt-4" key={mode} id={mode}>
          <Description className="text-[14px]">
            {TOPIC_FORMAT_OPTIONS[mode].description}
          </Description>
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}
