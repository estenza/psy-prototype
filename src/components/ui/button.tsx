import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "interactive-solid text-[var(--label-inverse)]",
  secondary: "interactive-secondary",
  ghost: "interactive-control bg-transparent",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "gap-2 rounded-xl px-3 py-2 text-[14px] font-medium",
  md: "gap-2 rounded-2xl px-4 py-3 text-sm font-semibold",
  lg: "gap-2 rounded-[18px] px-5 py-3.5 text-sm font-semibold",
};

export function Button({
  children,
  className = "",
  icon,
  size = "md",
  type = "button",
  variant = "secondary",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center transition-colors ${variantClasses[variant]} ${sizeClasses[size]} ${className}`.trim()}
      {...props}
    >
      {icon ? <span className="inline-flex items-center justify-center">{icon}</span> : null}
      {children}
    </button>
  );
}
