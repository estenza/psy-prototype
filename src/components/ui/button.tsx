import { Button as HeroButton, buttonVariants, cn } from "@heroui/react";
import type { ButtonProps as HeroButtonProps } from "@heroui/react";
import type { ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "tertiary";
export type ButtonSize = "sm" | "md" | "lg";

type HeroVariant = NonNullable<HeroButtonProps["variant"]>;

type ButtonProps = Omit<HeroButtonProps, "children" | "isDisabled" | "size" | "variant"> & {
  children?: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  isDisabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantMap: Record<ButtonVariant, HeroVariant> = {
  primary: "primary",
  secondary: "secondary",
  tertiary: "ghost",
};

const sizeMap: Record<ButtonSize, "sm" | "md" | "lg"> = {
  sm: "sm",
  md: "md",
  lg: "lg",
};

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
      size: sizeMap[size],
      variant: variantMap[variant],
    }),
    "rounded-full",
    className,
  );
}

export function Button({
  children,
  className = "",
  disabled,
  icon,
  isDisabled,
  size = "md",
  type = "button",
  variant = "secondary",
  ...props
}: ButtonProps) {
  return (
    <HeroButton
      type={type}
      isDisabled={isDisabled ?? disabled}
      size={sizeMap[size]}
      variant={variantMap[variant]}
      className={cn("rounded-full", className)}
      {...props}
    >
      {icon ? <span className="inline-flex items-center justify-center">{icon}</span> : null}
      {children}
    </HeroButton>
  );
}
