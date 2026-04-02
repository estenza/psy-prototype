import "server-only";

import { sendEmailViaSmtp } from "@/features/auth/lib/smtp-client";

type SendPasswordResetEmailInput = {
  expiresAt: string;
  resetUrl: string;
  toEmail: string;
};

type SendPasswordResetEmailResult = {
  debugResetUrl?: string;
};

function getSmtpConfig() {
  const host = process.env.AUTH_SMTP_HOST?.trim() || "";
  const port = Number.parseInt(process.env.AUTH_SMTP_PORT?.trim() || "", 10);
  const username = process.env.AUTH_SMTP_USERNAME?.trim() || "";
  const password = process.env.AUTH_SMTP_PASSWORD ?? "";
  const from = process.env.AUTH_EMAIL_FROM?.trim() || "";
  const heloHost = process.env.AUTH_SMTP_HELO_HOST?.trim() || "localhost";
  const secure =
    process.env.AUTH_SMTP_SECURE?.trim() === "true" ||
    (!Number.isNaN(port) && port === 465);

  return {
    from,
    heloHost,
    host,
    password,
    port: Number.isNaN(port) ? secure ? 465 : 587 : port,
    secure,
    username,
  };
}

function isSmtpConfigured() {
  const config = getSmtpConfig();
  return Boolean(config.host && config.from);
}

export async function sendPasswordResetEmail({
  expiresAt,
  resetUrl,
  toEmail,
}: SendPasswordResetEmailInput): Promise<SendPasswordResetEmailResult> {
  const config = getSmtpConfig();
  const text = [
    "Здравствуйте!",
    "",
    "Мы получили запрос на восстановление пароля для аккаунта внутри.",
    "Чтобы задать новый пароль, откройте ссылку:",
    resetUrl,
    "",
    `Ссылка действует до ${new Date(expiresAt).toISOString()} и сработает только один раз.`,
    "Если это были не вы, просто проигнорируйте это письмо.",
  ].join("\n");

  if (!isSmtpConfigured()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Password reset email transport is not configured.");
    }

    console.info("[auth/password-reset][preview]", {
      resetUrl,
      toEmail,
    });

    return {
      debugResetUrl: resetUrl,
    };
  }

  await sendEmailViaSmtp({
    from: config.from,
    fromName: "vnutri.live",
    heloHost: config.heloHost,
    host: config.host,
    password: config.password,
    port: config.port,
    secure: config.secure,
    subject: "Сброс пароля для внутри",
    text,
    to: toEmail,
    username: config.username || undefined,
  });

  return {};
}
