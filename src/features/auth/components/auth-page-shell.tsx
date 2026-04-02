import Link from "next/link";
import type { ReactNode } from "react";

export function AuthPageShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="surface-primary flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <Link
          href="/"
          className="font-helvetica text-[32px] font-black leading-none text-[var(--label-primary)]"
        >
          внутри.
        </Link>
      </div>
      {children}
    </main>
  );
}
