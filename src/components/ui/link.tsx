import { cn, linkVariants } from "@heroui/react";
import NextLink from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type LinkProps = Omit<ComponentPropsWithoutRef<typeof NextLink>, "className" | "href"> & {
  children: ReactNode;
  className?: string;
  href: string;
};

export function Link({
  children,
  className = "",
  href,
  ...props
}: LinkProps) {
  return (
    <NextLink
      href={href}
      className={cn(linkVariants({}).base(), "text-inherit text-xs", className)}
      {...props}
    >
      {children}
    </NextLink>
  );
}
