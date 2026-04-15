import type { ComponentPropsWithoutRef, ReactNode } from "react";

type FormFieldShellProps = ComponentPropsWithoutRef<"label"> & {
  children: ReactNode;
};

export function FormFieldShell({
  children,
  className = "",
  ...props
}: FormFieldShellProps) {
  return (
    <label
      className={`field-shell grid min-h-[54px] grid-cols-[minmax(0,1fr)_auto] gap-4 rounded-[16px] px-5 ${className}`.trim()}
      {...props}
    >
      {children}
    </label>
  );
}
