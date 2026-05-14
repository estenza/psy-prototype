import type { ReactNode } from "react";

type PrimaryColumnProps = {
  children: ReactNode;
  className?: string;
};

export function PrimaryColumn({
  children,
  className = "",
}: PrimaryColumnProps) {
  return (
    <div
      data-testid="primaryColumn"
      className={`app-primary-column min-w-0 px-3 min-[480px]:shrink-0 min-[480px]:px-4 ${className}`.trim()}
    >
      {children}
    </div>
  );
}
