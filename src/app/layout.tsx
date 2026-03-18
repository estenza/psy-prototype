import type { Metadata } from "next";
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
      <body className="antialiased">{children}</body>
    </html>
  );
}
