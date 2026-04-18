"use client";

import type { ButtonProps as HeroButtonProps } from "@heroui/react";
import { Button as HeroButton, cn } from "@heroui/react";
import type { ReactNode } from "react";
import {
  type ButtonVariant,
  buttonVariantMap,
} from "@/components/ui/button-styles";

type IconButtonProps = Omit<HeroButtonProps, "children" | "isDisabled" | "size" | "variant"> & {
  disabled?: boolean;
  icon: ReactNode;
  isDisabled?: boolean;
  label: string;
  variant?: ButtonVariant;
};

export function IconButton({
  className = "",
  disabled,
  icon,
  isDisabled,
  label,
  type = "button",
  variant = "tertiary",
  ...props
}: IconButtonProps) {
  return (
    <HeroButton
      type={type}
      aria-label={label}
      isDisabled={isDisabled ?? disabled}
      isIconOnly
      size="sm"
      variant={buttonVariantMap[variant]}
      className={cn("h-10 w-10 flex-none min-w-10 rounded-full p-0", className)}
      {...props}
    >
      <span className="inline-flex items-center justify-center">{icon}</span>
    </HeroButton>
  );
}
