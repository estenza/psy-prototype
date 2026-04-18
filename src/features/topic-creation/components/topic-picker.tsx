import { Header, ListBox, Select } from "@heroui/react";
import { POST_TOPIC_OPTIONS } from "@/constants/post-taxonomy";
import type { PostTopic } from "@/types/post-taxonomy";

type TopicPickerProps = {
  onChange: (nextTopic: PostTopic | null) => void;
  value: PostTopic | null;
};

export function TopicPicker({ onChange, value }: TopicPickerProps) {
  const isPlaceholderState = value === null;
  const selectedItemClassName =
    "pl-4 pr-3 py-2 font-normal transition-colors data-[selected=true]:text-[var(--accent-primary)]";

  return (
    <Select
      aria-label="Выберите тему"
      selectedKey={value ?? "none"}
      onSelectionChange={(nextKey) => {
        if (typeof nextKey === "string") {
          onChange(nextKey === "none" ? null : (nextKey as PostTopic));
        }
      }}
      className="w-full"
    >
      <Select.Trigger
        className="rounded-[16px] pl-5 pr-5 py-4 text-[16px] leading-6 font-normal"
      >
        <Select.Value
          className={isPlaceholderState ? "text-[16px] leading-6 font-normal text-[var(--field-placeholder)]" : "text-[16px] leading-6 font-normal"}
        />
        <Select.Indicator className="text-[var(--field-placeholder)]" />
      </Select.Trigger>

      <Select.Popover placement="top start">
        <ListBox aria-label="Выберите тему" className="text-[16px] leading-6">
          <ListBox.Section>
            <Header className="px-3">Выберите тему</Header>

            <ListBox.Item id="none" textValue="Тема не выбрана" className={selectedItemClassName}>
              <ListBox.ItemIndicator className="text-[var(--accent-primary)]" />
              <span className="font-normal">Тема не выбрана</span>
            </ListBox.Item>

            {POST_TOPIC_OPTIONS.map((topic) => (
              <ListBox.Item
                key={topic.value}
                id={topic.value}
                textValue={topic.label}
                className={selectedItemClassName}
              >
                <ListBox.ItemIndicator className="text-[var(--accent-primary)]" />
                <span className="font-normal">{topic.label}</span>
              </ListBox.Item>
            ))}
          </ListBox.Section>
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
