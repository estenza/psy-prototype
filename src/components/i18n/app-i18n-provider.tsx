"use client";

import { I18nProvider } from "@heroui/react";
import type { ReactNode } from "react";

type AppI18nProviderProps = {
  children: ReactNode;
  locale: string;
};

export function AppI18nProvider({ children, locale }: AppI18nProviderProps) {
  return <I18nProvider locale={locale}>{children}</I18nProvider>;
}
