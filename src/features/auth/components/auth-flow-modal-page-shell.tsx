import type { ReactNode } from "react";
import { AuthRequiredProvider } from "@/features/auth/components/auth-required-provider";
import { CreateTopicEntry } from "@/features/topic-creation/components/create-topic-entry";

type AuthFlowModalPageShellProps = {
  children: ReactNode;
  nextPath: string;
};

function getNextPathname(nextPath: string) {
  try {
    return new URL(nextPath, "http://localhost").pathname;
  } catch {
    return nextPath.split(/[?#]/, 1)[0] || "/";
  }
}

function AuthFlowBackground({ nextPath }: { nextPath: string }) {
  const nextPathname = getNextPathname(nextPath);

  if (nextPathname === "/create-topic") {
    return (
      <AuthRequiredProvider initialUser={null}>
        <div aria-hidden="true" className="pointer-events-none">
          <CreateTopicEntry />
        </div>
      </AuthRequiredProvider>
    );
  }

  return null;
}

export function AuthFlowModalPageShell({
  children,
  nextPath,
}: AuthFlowModalPageShellProps) {
  return (
    <main className="surface-primary relative min-h-dvh">
      <AuthFlowBackground nextPath={nextPath} />

      <div className="fixed inset-0 z-[200] flex min-h-dvh items-center justify-center bg-[rgba(0,0,0,0.48)] p-4">
        {children}
      </div>
    </main>
  );
}
