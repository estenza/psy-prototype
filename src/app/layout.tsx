import type { Metadata } from "next";
import { AppToastProvider } from "@/components/feedback/app-toast-provider";
import { EnvironmentAttributes } from "@/components/layout/environment-attributes";
import { AppThemeProvider } from "@/components/theme/app-theme-provider";
import { AuthRequiredProvider } from "@/features/auth/components/auth-required-provider";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { getAppEnvironment } from "@/lib/app-env";
import "./globals.css";

export const metadata: Metadata = {
  title: "внутри",
  description: "Анонимная платформа для психологических историй и поддержки",
};

const themeInitializationScript = `
  (function () {
    try {
      var storageKey = "psy-prototype:theme";
      var savedTheme = window.localStorage.getItem(storageKey);
      var theme =
        savedTheme === "dark" || savedTheme === "light"
          ? savedTheme
          : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(theme);
      document.documentElement.classList.toggle("theme-dark", theme === "dark");
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch (error) {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.dataset.theme = "light";
      document.documentElement.style.colorScheme = "light";
    }
  })();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appEnvironment = getAppEnvironment();
  const currentUser = await getCurrentUser();

  return (
    <html
      lang="ru"
      data-app-env={appEnvironment}
      data-theme="light"
      className="light"
      suppressHydrationWarning
    >
      <head>
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
          <AppToastProvider />
        </AppThemeProvider>
      </body>
    </html>
  );
}
