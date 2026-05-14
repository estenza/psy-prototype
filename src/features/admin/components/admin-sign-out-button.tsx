"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOutIcon } from "@/components/ui/icons";
import { dispatchAuthStateChanged } from "@/features/auth/hooks/use-current-user";

export function AdminSignOutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      await fetch("/api/auth/sign-out", {
        method: "POST",
      });
      dispatchAuthStateChanged();
      router.refresh();
      router.push("/");
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <Button
      aria-label="Выйти"
      className="min-w-9 px-0"
      icon={<LogOutIcon />}
      isIconOnly
      size="sm"
      isDisabled={isSigningOut}
      onPress={() => {
        void handleSignOut();
      }}
      variant="secondary"
    />
  );
}
