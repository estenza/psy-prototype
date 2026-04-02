import type { Metadata } from "next";
import Script from "next/script";
import { AuthRequiredProvider } from "@/features/auth/components/auth-required-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "внутри",
  description: "Анонимная платформа для психологических историй и поддержки",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">
        <Script
          id="staging-host-marker"
          strategy="beforeInteractive"
        >{`document.documentElement.dataset.appEnv = window.location.hostname === "staging.vnutri.live" ? "staging" : "production";`}</Script>
        <AuthRequiredProvider>{children}</AuthRequiredProvider>
      </body>
    </html>
  );
}
