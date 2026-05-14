import { cn } from "@heroui/styles";
import NextLink from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type ProfileTextLinkProps = Omit<ComponentPropsWithoutRef<typeof NextLink>, "className"> & {
  children: ReactNode;
  className?: string;
};

export const profileTextLinkClassName =
  "pointer-events-auto rounded-none p-0 no-underline transition-[text-decoration-color] duration-100 ease-out hover:underline focus-visible:underline decoration-[color:var(--underline-primary)] decoration-[2px] underline-offset-4";

export function ProfileTextLink({
  children,
  className = "",
  ...props
}: ProfileTextLinkProps) {
  return (
    <NextLink
      className={cn(profileTextLinkClassName, className)}
      {...props}
    >
      {children}
    </NextLink>
  );
}
