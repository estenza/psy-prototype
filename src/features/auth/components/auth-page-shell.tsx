import Link from "next/link";
import type { ReactNode } from "react";
import { AppBrand } from "@/components/layout/app-brand";

export function AuthPageShell({
  children,
  homeHref = "/",
}: {
  children: ReactNode;
  homeHref?: string;
}) {
  return (
    <main className="surface-primary flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <Link
          href={homeHref}
          aria-label="внутри"
          className="inline-flex max-w-full"
        >
          <AppBrand />
        </Link>
      </div>
      {children}
    </main>
  );
}
