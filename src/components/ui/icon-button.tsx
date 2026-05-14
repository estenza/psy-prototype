"use client";

import type { ButtonProps as HeroButtonProps } from "@heroui/react";
import { Button as HeroButton, cn } from "@heroui/react";
import type { ReactNode } from "react";
import {
  type ButtonSize,
  type ButtonVariant,
  buttonClassName,
  buttonSizeMap,
  buttonVariantMap,
} from "@/components/ui/button-styles";

type IconButtonProps = Omit<HeroButtonProps, "children" | "className" | "isDisabled" | "size" | "variant"> & {
  className?: string;
  disabled?: boolean;
  icon: ReactNode;
  isDisabled?: boolean;
  label: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

export function IconButton({
  className = "",
  disabled,
  icon,
  isDisabled,
  label,
  size = "s",
  type = "button",
  variant = "quaternary",
  ...props
}: IconButtonProps) {
  return (
    <HeroButton
      type={type}
      aria-label={label}
      isDisabled={isDisabled ?? disabled}
      isIconOnly
      size={buttonSizeMap[size]}
      variant={buttonVariantMap[variant]}
      className={buttonClassName({
        className: cn("flex-none", className),
        isIconOnly: true,
        size,
        variant,
      })}
      {...props}
    >
      <span className="inline-flex items-center justify-center">{icon}</span>
    </HeroButton>
  );
}
