"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type AdminBrowserRedirectProps = {
  href: string;
};

export function AdminBrowserRedirect({ href }: AdminBrowserRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    router.replace(href);
  }, [href, router]);

  return (
    <div className="surface-primary text-label-primary flex min-h-dvh items-center justify-center px-6 text-center">
      <div className="max-w-[420px]">
        <p className="text-sm text-[var(--label-secondary)]">
          Перенаправляем во вход в админку...
        </p>
        <Link
          href={href}
          className="mt-4 inline-flex text-sm font-semibold text-[var(--accent-primary)]"
        >
          Перейти вручную
        </Link>
      </div>
    </div>
  );
}
