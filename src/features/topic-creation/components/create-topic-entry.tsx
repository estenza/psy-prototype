"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { useAuthClient } from "@/features/auth/components/auth-required-provider";
import { CreateTopicScreen } from "@/features/topic-creation/components/create-topic-screen";

export function CreateTopicEntry() {
  const {
    openAuthModal,
    status,
    user,
  } = useAuthClient();

  useEffect(() => {
    if (status === "unauthenticated") {
      openAuthModal();
    }
  }, [openAuthModal, status]);

  if (status === "authenticated" && user) {
    return <CreateTopicScreen />;
  }

  return (
    <div className="surface-primary text-label-primary min-h-dvh">
      <AppHeader showCreateAction={false} />

      <main className="mx-auto flex min-h-dvh max-w-[760px] items-center justify-center px-4 min-[721px]:pt-[var(--app-header-height)] sm:px-6">
        <div className="border-separator surface-primary w-full rounded-[28px] border px-5 py-7 text-center sm:px-7">
          <h1 className="font-helvetica text-[28px] font-bold leading-none">
            Создание обсуждения доступно после авторизации
          </h1>
          <p className="mt-3 text-[14px] leading-6 text-[var(--label-secondary)]">
            Откройте модалку входа или регистрации и затем вернитесь в этот flow.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="!rounded-full"
              onClick={openAuthModal}
            >
              Открыть авторизацию
            </Button>
            <Link
              href="/"
              className="interactive-tertiary rounded-full px-4 py-2 text-sm font-semibold text-[var(--label-primary)]"
            >
              На главную
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
