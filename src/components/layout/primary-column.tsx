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
      className={`min-w-0 min-[721px]:shrink-0 min-[721px]:pr-4 min-[1040px]:pr-0 ${className}`.trim()}
    >
      {children}
    </div>
  );
}
