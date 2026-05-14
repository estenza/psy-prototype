"use client";

import { Button as HeroButton, Spinner } from "@heroui/react";
import type { ButtonProps as HeroButtonProps } from "@heroui/react";
import type { ReactNode } from "react";
import {
  type ButtonSize,
  type ButtonVariant,
  buttonClassName,
  buttonSizeMap,
  buttonVariantMap,
} from "@/components/ui/button-styles";

type ButtonProps = Omit<HeroButtonProps, "children" | "className" | "isDisabled" | "isPending" | "size" | "variant"> & {
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  icon?: ReactNode;
  isDisabled?: boolean;
  isLoading?: boolean;
  isPending?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  children,
  className = "",
  disabled,
  icon,
  isDisabled,
  isLoading,
  isPending,
  size = "m",
  type = "button",
  variant = "secondary",
  ...props
}: ButtonProps) {
  const isIconOnly = Boolean(props.isIconOnly);
  const isPendingState = Boolean(isPending ?? isLoading);

  return (
    <HeroButton
      type={type}
      isDisabled={isDisabled ?? disabled}
      isPending={isPendingState}
      size={buttonSizeMap[size]}
      variant={buttonVariantMap[variant]}
      aria-busy={isPendingState || undefined}
      className={buttonClassName({
        className: isPendingState ? `${className} relative` : className,
        isIconOnly,
        size,
        variant,
      })}
      {...props}
    >
      {isPendingState ? (
        <>
          <span className="inline-flex items-center justify-center gap-2 opacity-0">
            {icon ? <span className="inline-flex items-center justify-center">{icon}</span> : null}
            {children}
          </span>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 inline-flex items-center justify-center"
          >
            <Spinner color="current" size="sm" />
          </span>
        </>
      ) : (
        <>
          {icon ? <span className="inline-flex items-center justify-center">{icon}</span> : null}
          {children}
        </>
      )}
    </HeroButton>
  );
}
