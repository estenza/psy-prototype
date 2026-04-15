import { IconButton } from "@/components/ui/icon-button";
import { TopicBackIcon } from "@/features/topic-creation/components/topic-creation-icons";

type BackNavigationButtonProps = {
  className?: string;
  label?: string;
  onClick: () => void;
};

export function BackNavigationButton({
  className = "",
  label,
  onClick,
}: BackNavigationButtonProps) {
  return (
    <IconButton
      onClick={onClick}
      label={label ?? "Назад"}
      icon={<TopicBackIcon />}
      className={className}
    />
  );
}
