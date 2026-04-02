import type { Metadata } from "next";
import { EnvironmentMarker } from "@/components/layout/environment-marker";
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
        <EnvironmentMarker />
        <AuthRequiredProvider>{children}</AuthRequiredProvider>
      </body>
    </html>
  );
}
