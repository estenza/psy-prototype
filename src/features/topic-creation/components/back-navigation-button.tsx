import { Button } from "@/components/ui/button";
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
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      aria-label={label ?? "Назад"}
      icon={<TopicBackIcon />}
      className={`h-9 min-w-[52px] flex-none cursor-pointer !rounded-[24px] !px-4 !py-2 hover:bg-[var(--fill-control-hover)] active:bg-[var(--fill-secondary)] ${
        label ? "gap-2" : "gap-0"
      } ${className}`.trim()}
    >
      {label ? <span className="text-[14px] font-medium leading-5">{label}</span> : null}
    </Button>
  );
}
