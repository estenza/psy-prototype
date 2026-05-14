import { buttonVariants, cn } from "@heroui/styles";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "tertiary-accent"
  | "quaternary"
  | "quaternary-accent";
export type ButtonSize = "xs" | "s" | "m" | "l" | "sm" | "md" | "lg";

export const buttonVariantMap = {
  primary: "primary",
  secondary: "secondary",
  tertiary: "ghost",
  "tertiary-accent": "ghost",
  quaternary: "ghost",
  "quaternary-accent": "ghost",
} as const satisfies Record<ButtonVariant, "primary" | "secondary" | "ghost">;

export const buttonSizeMap = {
  xs: "sm",
  s: "sm",
  m: "md",
  l: "lg",
  sm: "sm",
  md: "md",
  lg: "lg",
} as const satisfies Record<ButtonSize, "sm" | "md" | "lg">;

export const buttonControlSizeClassMap = {
  xs: "!h-7 !min-h-7 px-3 !text-[14px] !leading-5",
  s: "!h-9 !min-h-9 px-4 !text-[14px] !leading-5",
  m: "!h-11 !min-h-11 px-5 !text-[16px] !leading-6",
  l: "!h-[52px] !min-h-[52px] px-4 !text-[18px] !leading-7",
  sm: "!h-9 !min-h-9 px-4 !text-[14px] !leading-5",
  md: "!h-11 !min-h-11 px-5 !text-[16px] !leading-6",
  lg: "!h-[52px] !min-h-[52px] px-4 !text-[18px] !leading-7",
} as const satisfies Record<ButtonSize, string>;

export const iconButtonControlSizeClassMap = {
  xs: "!h-7 !min-h-7 !w-7 !min-w-7 !p-0",
  s: "!h-9 !min-h-9 !w-9 !min-w-9 !p-0",
  m: "!h-11 !min-h-11 !w-11 !min-w-11 !p-0",
  l: "!h-[52px] !min-h-[52px] !w-[52px] !min-w-[52px] !p-0",
  sm: "!h-9 !min-h-9 !w-9 !min-w-9 !p-0",
  md: "!h-11 !min-h-11 !w-11 !min-w-11 !p-0",
  lg: "!h-[52px] !min-h-[52px] !w-[52px] !min-w-[52px] !p-0",
} as const satisfies Record<ButtonSize, string>;

export function buttonClassName({
  className = "",
  isIconOnly = false,
  size = "m",
  variant = "secondary",
}: {
  className?: string;
  isIconOnly?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
}) {
  return cn(
    buttonVariants({
      size: buttonSizeMap[size],
      variant: buttonVariantMap[variant],
    }),
    "rounded-full font-medium",
    `button--${variant}`,
    isIconOnly ? iconButtonControlSizeClassMap[size] : buttonControlSizeClassMap[size],
    className,
  );
}
