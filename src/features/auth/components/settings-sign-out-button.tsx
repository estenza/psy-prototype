"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { dispatchAuthStateChanged } from "@/features/auth/hooks/use-current-user";

export function SettingsSignOutButton() {
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
      className="w-full justify-center min-[480px]:w-auto"
      isDisabled={isSigningOut}
      onPress={() => {
        void handleSignOut();
      }}
      variant="secondary"
    >
      {isSigningOut ? "Выходим..." : "Выйти"}
    </Button>
  );
}
