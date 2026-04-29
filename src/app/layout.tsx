import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AppToastProvider } from "@/components/feedback/app-toast-provider";
import { EnvironmentAttributes } from "@/components/layout/environment-attributes";
import { AppThemeProvider } from "@/components/theme/app-theme-provider";
import { AuthRequiredProvider } from "@/features/auth/components/auth-required-provider";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { getAppEnvironment } from "@/lib/app-env";
import { APP_THEME_COOKIE_NAME } from "@/components/theme/theme-constants";
import "./globals.css";

export const metadata: Metadata = {
  title: "внутри",
  description: "Анонимная платформа для психологических историй и поддержки",
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
      lang="ru"
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
        <AppThemeProvider>
          <EnvironmentAttributes />
          <AuthRequiredProvider initialUser={currentUser}>
            {children}
          </AuthRequiredProvider>
          <div className="app-shell-layer">
            <AppToastProvider />
          </div>
        </AppThemeProvider>
      </body>
    </html>
  );
}
