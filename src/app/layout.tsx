import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { AppToastProvider } from "@/components/feedback/app-toast-provider";
import { AppI18nProvider } from "@/components/i18n/app-i18n-provider";
import { EnvironmentAttributes } from "@/components/layout/environment-attributes";
import { AppThemeProvider } from "@/components/theme/app-theme-provider";
import { RussianTypographyProvider } from "@/components/typography/russian-typography-provider";
import { AuthRequiredProvider } from "@/features/auth/components/auth-required-provider";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { getAppEnvironment } from "@/lib/app-env";
import { buildPublicAppUrl } from "@/lib/app-url";
import { APP_THEME_COOKIE_NAME } from "@/components/theme/theme-constants";
import "./globals.css";

const SITE_DESCRIPTION = "Психологическая платформа";
const APP_LANGUAGE = "ru";
const APP_LOCALE = "ru-RU";
const publicAppUrl = buildPublicAppUrl();

export const metadata: Metadata = {
  metadataBase: new URL(publicAppUrl),
  title: "внутри",
  applicationName: "внутри",
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    url: publicAppUrl,
    siteName: "внутри",
    title: "внутри",
    description: SITE_DESCRIPTION,
    locale: "ru_RU",
  },
  twitter: {
    card: "summary",
    title: "внутри",
    description: SITE_DESCRIPTION,
  },
  formatDetection: {
    address: false,
    date: false,
    email: false,
    telephone: false,
    url: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  height: "device-height",
  initialScale: 1,
  viewportFit: "cover",
  userScalable: false,
};

const themeInitializationScript = `
  (function () {
    try {
      var cookieName = "${APP_THEME_COOKIE_NAME}";
      function getCookie(name) {
        var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? decodeURIComponent(match[2]) : null;
      }
      var saved = getCookie(cookieName) || window.localStorage.getItem("psy-prototype:theme");
      var preference = saved === "dark" || saved === "light" || saved === "system" ? saved : "light";
      var systemTheme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      var theme = preference === "system" ? systemTheme : preference;
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(theme);
      document.documentElement.classList.toggle("theme-dark", theme === "dark");
      document.documentElement.dataset.theme = theme;
      document.documentElement.dataset.themePreference = preference;
      document.documentElement.style.colorScheme = theme;
    } catch (e) {}
  })();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appEnvironment = getAppEnvironment();
  const currentUser = await getCurrentUser({
    completeSkippableUserOnboarding: false,
  });
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get(APP_THEME_COOKIE_NAME)?.value;
  const initialThemePreference =
    themeCookie === "dark" || themeCookie === "light" || themeCookie === "system"
      ? themeCookie
      : "light";
  const initialTheme = initialThemePreference === "dark" ? "dark" : "light";

  return (
    <html
      lang={APP_LANGUAGE}
      data-app-env={appEnvironment}
      data-theme={initialTheme}
      data-theme-preference={initialThemePreference}
      className={initialTheme}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://yastatic.net" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://autofill.yandex.ru" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://yastatic.net" />
        <link rel="dns-prefetch" href="https://autofill.yandex.ru" />
        <script
          dangerouslySetInnerHTML={{
            __html: themeInitializationScript,
          }}
        />
      </head>
      <body className="antialiased">
        <AppI18nProvider locale={APP_LOCALE}>
          <AppThemeProvider initialThemePreference={initialThemePreference}>
            <EnvironmentAttributes />
            <RussianTypographyProvider />
            <AuthRequiredProvider initialUser={currentUser}>
              {children}
            </AuthRequiredProvider>
            <div className="app-shell-layer">
              <AppToastProvider />
            </div>
          </AppThemeProvider>
        </AppI18nProvider>
      </body>
    </html>
  );
}
