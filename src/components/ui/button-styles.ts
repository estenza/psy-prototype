import { buttonVariants, cn } from "@heroui/styles";

export type ButtonVariant = "primary" | "secondary" | "tertiary";
export type ButtonSize = "sm" | "md" | "lg";

export const buttonVariantMap = {
  primary: "primary",
  secondary: "secondary",
  tertiary: "ghost",
} as const satisfies Record<ButtonVariant, "primary" | "secondary" | "ghost">;

export const buttonSizeMap = {
  sm: "sm",
  md: "md",
  lg: "lg",
} as const satisfies Record<ButtonSize, "sm" | "md" | "lg">;

export function buttonClassName({
  className = "",
  size = "md",
  variant = "secondary",
}: {
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
}) {
  return cn(
    buttonVariants({
      size: buttonSizeMap[size],
      variant: buttonVariantMap[variant],
    }),
    "rounded-full",
    className,
  );
}
