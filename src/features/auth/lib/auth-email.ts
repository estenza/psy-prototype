import "server-only";

import { sendEmailViaSmtp } from "@/features/auth/lib/smtp-client";

function getTelegramConfig() {
  return {
    botToken: process.env.TELEGRAM_BOT_TOKEN?.trim() || "",
    chatId: process.env.TELEGRAM_CHAT_ID?.trim() || "",
  };
}

function isTelegramConfigured() {
  const { botToken, chatId } = getTelegramConfig();
  return Boolean(botToken && chatId);
}

async function sendViaTelegram(text: string) {
  const { botToken, chatId } = getTelegramConfig();

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram API error: ${body}`);
  }
}

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

type SendOTPEmailInput = {
  adminContext?: boolean;
  code: string;
  purpose: "sign-in" | "sign-up";
  toEmail: string;
};

type SendOTPEmailResult = {
  debugOtpCode?: string;
};

export async function sendOTPEmail({
  adminContext = false,
  code,
  toEmail,
}: SendOTPEmailInput): Promise<SendOTPEmailResult> {
  const config = getSmtpConfig();
  const action = "вход";
  const shouldAlsoSendToTelegram = adminContext && isTelegramConfigured();
  const emailText = [
    "Здравствуйте!",
    "",
    "Ваш код для входа в приложении внутри:",
    "",
    code,
    "",
    "Код действителен 15 минут и работает только один раз.",
    "Если это были не вы — просто проигнорируйте это письмо.",
  ].join("\n");

  if (isSmtpConfigured()) {
    await sendEmailViaSmtp({
      from: config.from,
      fromName: "внутри",
      heloHost: config.heloHost,
      host: config.host,
      password: config.password,
      port: config.port,
      secure: config.secure,
      subject: `Код подтверждения: ${code}`,
      text: emailText,
      to: toEmail,
      username: config.username || undefined,
    });

    if (shouldAlsoSendToTelegram) {
      const tgText = `🔐 <b>Код подтверждения внутри</b>\n\nEmail: <code>${toEmail}</code>\nДействие: ${action}\nКод: <b><code>${code}</code></b>\n\n⏱ Действителен 15 минут`;
      await sendViaTelegram(tgText);
    }

    return {};
  }

  if (isTelegramConfigured()) {
    const tgText = `🔐 <b>Код подтверждения внутри</b>\n\nEmail: <code>${toEmail}</code>\nДействие: ${action}\nКод: <b><code>${code}</code></b>\n\n⏱ Действителен 15 минут`;
    await sendViaTelegram(tgText);
    return {};
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("OTP delivery is not configured.");
  }

  console.info("[auth/otp][preview]", {
    code,
    purpose: "sign-in",
    toEmail,
  });

  return {
    debugOtpCode: code,
  };
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
