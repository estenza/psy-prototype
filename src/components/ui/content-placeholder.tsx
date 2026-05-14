import type { ElementType, ReactNode } from "react";

type ContentPlaceholderProps = {
  action?: ReactNode;
  className?: string;
  description: ReactNode;
  title: ReactNode;
  titleAs?: ElementType;
  titleClassName?: string;
};

export function ContentPlaceholder({
  action,
  className = "",
  description,
  title,
  titleAs: TitleTag = "h2",
  titleClassName = "type-h2 font-medium text-[var(--label-primary)]",
}: ContentPlaceholderProps) {
  return (
    <div
      className={`surface-elevated rounded-[28px] px-6 py-12 text-center ${className}`.trim()}
    >
      <TitleTag className={titleClassName}>
        {title}
      </TitleTag>
      <p className="mt-1 text-[16px] leading-6 text-[var(--label-tertiary)]">
        {description}
      </p>
      {action ? (
        <div className="mt-6 flex justify-center">
          {action}
        </div>
      ) : null}
    </div>
  );
}
