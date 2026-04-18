"use client";

import { Button as HeroButton } from "@heroui/react";
import { cn } from "@heroui/styles";
import type { ButtonProps as HeroButtonProps } from "@heroui/react";
import type { ReactNode } from "react";
import {
  type ButtonSize,
  type ButtonVariant,
  buttonSizeMap,
  buttonVariantMap,
} from "@/components/ui/button-styles";

type ButtonProps = Omit<HeroButtonProps, "children" | "isDisabled" | "size" | "variant"> & {
  children?: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  isDisabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

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
      size={buttonSizeMap[size]}
      variant={buttonVariantMap[variant]}
      className={cn("rounded-full", className)}
      {...props}
    >
      {icon ? <span className="inline-flex items-center justify-center">{icon}</span> : null}
      {children}
    </HeroButton>
  );
}
