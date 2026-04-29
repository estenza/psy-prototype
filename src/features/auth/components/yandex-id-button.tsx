"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { encodeYandexDirectAuthState } from "@/features/auth/lib/yandex-direct-auth";

type YandexIdButtonProps = {
  isPublishingFlow: boolean;
  nextHref: string;
};

type YandexIdConfig = {
  clientId?: string;
  enabled: boolean;
  redirectUri?: string;
};

const YANDEX_AUTHORIZE_URL = "https://oauth.yandex.ru/authorize";

function YandexIdLogo() {
  return (
    <svg
      aria-hidden
      className="h-5 w-5"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0 10C0 4.47727 4.47636 0 10 0C15.5218 0 20 4.47727 20 10C20 15.5227 15.5218 20 10 20C4.47636 20 0 15.5227 0 10Z"
        fill="#FC3F1D"
      />
      <path
        d="M11.2818 5.66454H10.3573C8.66275 5.66454 7.77184 6.52272 7.77184 7.78817C7.77184 9.21817 8.3882 9.88817 9.65366 10.7473L10.6982 11.4509L7.69456 15.9382H5.45093L8.14638 11.9236C6.59638 10.8127 5.72638 9.73363 5.72638 7.90908C5.72638 5.6209 7.32093 4.05908 10.3464 4.05908H13.3491V15.9273H11.2809L11.2818 5.66454Z"
        fill="white"
      />
    </svg>
  );
}

function buildYandexAuthorizeUrl({
  clientId,
  isPublishingFlow,
  nextHref,
  redirectUri,
}: {
  clientId: string;
  isPublishingFlow: boolean;
  nextHref: string;
  redirectUri: string;
}) {
  const url = new URL(YANDEX_AUTHORIZE_URL);
  url.searchParams.set("response_type", "token");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set(
    "state",
    encodeYandexDirectAuthState({
      isPublishingFlow,
      nextHref,
    }),
  );

  return url.toString();
}

export function YandexIdButton({
  isPublishingFlow,
  nextHref,
}: YandexIdButtonProps) {
  const [errorText, setErrorText] = useState("");
  const [isOpening, setIsOpening] = useState(false);

  async function handleClick() {
    if (isOpening) {
      return;
    }

    setErrorText("");
    setIsOpening(true);

    try {
      const response = await fetch("/api/auth/yandex/config", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Yandex ID config request failed.");
      }

      const config = (await response.json()) as YandexIdConfig;
      const clientId = config.clientId?.trim();
      const redirectUri = config.redirectUri?.trim();

      if (!config.enabled || !clientId || !redirectUri) {
        throw new Error("Yandex ID is not configured.");
      }

      window.location.assign(
        buildYandexAuthorizeUrl({
          clientId,
          isPublishingFlow,
          nextHref,
          redirectUri,
        }),
      );
    } catch {
      setErrorText("Не удалось открыть вход через Yandex ID");
      setIsOpening(false);
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        size="lg"
        className="w-full !rounded-full"
        icon={<YandexIdLogo />}
        isDisabled={isOpening}
        onClick={handleClick}
      >
        Войти с Yandex ID
      </Button>
      {errorText ? (
        <p className="type-caption text-[var(--status-danger)]">{errorText}</p>
      ) : null}
    </>
  );
}
