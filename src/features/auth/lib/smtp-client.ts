import "server-only";

import { randomUUID } from "node:crypto";
import net from "node:net";
import tls from "node:tls";

type SocketLike = net.Socket | tls.TLSSocket;

type SmtpResponse = {
  code: number;
  lines: string[];
};

type SendEmailViaSmtpInput = {
  from: string;
  fromName?: string;
  heloHost?: string;
  host: string;
  password?: string;
  port: number;
  secure?: boolean;
  subject: string;
  text: string;
  to: string;
  username?: string;
};

const SMTP_TIMEOUT_MS = 10_000;

function encodeMimeHeader(value: string) {
  return /[^\x20-\x7E]/.test(value)
    ? `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`
    : value;
}

function formatAddress(address: string, displayName?: string) {
  return displayName ? `${encodeMimeHeader(displayName)} <${address}>` : `<${address}>`;
}

function encodeBody(text: string) {
  const base64 = Buffer.from(text, "utf8").toString("base64");
  return base64.match(/.{1,76}/g)?.join("\r\n") ?? "";
}

function escapeSmtpBody(message: string) {
  return message.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
}

function parseCapabilities(lines: string[]) {
  return lines
    .map((line) => line.slice(4).trim().toUpperCase())
    .filter(Boolean);
}

function getSupportedAuthMethods(capabilities: string[]) {
  const authCapability = capabilities.find((line) => line.startsWith("AUTH "));

  if (!authCapability) {
    return new Set<string>();
  }

  return new Set(
    authCapability
      .replace(/^AUTH\s+/, "")
      .split(/\s+/)
      .map((method) => method.trim())
      .filter(Boolean),
  );
}

function buildMessage({
  from,
  fromName,
  host,
  subject,
  text,
  to,
}: {
  from: string;
  fromName?: string;
  host: string;
  subject: string;
  text: string;
  to: string;
}) {
  const headers = [
    `From: ${formatAddress(from, fromName)}`,
    `To: ${formatAddress(to)}`,
    `Subject: ${encodeMimeHeader(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${randomUUID()}@${host}>`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
  ];

  return `${headers.join("\r\n")}\r\n\r\n${encodeBody(text)}`;
}

function connectSocket({
  host,
  port,
  secure,
}: {
  host: string;
  port: number;
  secure: boolean;
}) {
  return new Promise<SocketLike>((resolve, reject) => {
    const socket = secure
      ? tls.connect({
          host,
          port,
          servername: host,
        })
      : net.createConnection({
          host,
          port,
        });

    const handleError = (error: Error) => {
      socket.removeListener("connect", handleConnect);
      socket.removeListener("secureConnect", handleConnect);
      reject(error);
    };

    const handleConnect = () => {
      socket.removeListener("error", handleError);
      socket.setTimeout(SMTP_TIMEOUT_MS, () => {
        socket.destroy(new Error("SMTP connection timeout."));
      });
      resolve(socket);
    };

    socket.once("error", handleError);
    if (secure) {
      socket.once("secureConnect", handleConnect);
    } else {
      socket.once("connect", handleConnect);
    }
  });
}

function upgradeSocketToTls(socket: net.Socket, host: string) {
  return new Promise<tls.TLSSocket>((resolve, reject) => {
    const tlsSocket = tls.connect({
      socket,
      servername: host,
    });

    const handleError = (error: Error) => {
      tlsSocket.removeListener("secureConnect", handleSecureConnect);
      reject(error);
    };

    const handleSecureConnect = () => {
      tlsSocket.removeListener("error", handleError);
      tlsSocket.setTimeout(SMTP_TIMEOUT_MS, () => {
        tlsSocket.destroy(new Error("SMTP TLS handshake timeout."));
      });
      resolve(tlsSocket);
    };

    tlsSocket.once("error", handleError);
    tlsSocket.once("secureConnect", handleSecureConnect);
  });
}

class SmtpConnection {
  private buffer = "";
  private currentLines: string[] = [];
  private pendingResponses: SmtpResponse[] = [];
  private pendingReaders: Array<{
    reject: (error: Error) => void;
    resolve: (response: SmtpResponse) => void;
  }> = [];
  private readonly onCloseBound = this.onClose.bind(this);
  private readonly onDataBound = this.onData.bind(this);
  private readonly onErrorBound = this.onError.bind(this);

  constructor(private socket: SocketLike) {
    socket.on("close", this.onCloseBound);
    socket.on("data", this.onDataBound);
    socket.on("error", this.onErrorBound);
  }

  detach() {
    this.socket.removeListener("close", this.onCloseBound);
    this.socket.removeListener("data", this.onDataBound);
    this.socket.removeListener("error", this.onErrorBound);
  }

  writeRaw(value: string) {
    this.socket.write(value);
  }

  writeLine(value: string) {
    this.socket.write(`${value}\r\n`);
  }

  async expectResponse(expectedCodes: number[]) {
    const response = await this.readResponse();

    if (!expectedCodes.includes(response.code)) {
      throw new Error(
        `Unexpected SMTP response ${response.code}: ${response.lines.join(" | ")}`,
      );
    }

    return response;
  }

  async readResponse() {
    if (this.pendingResponses.length > 0) {
      return this.pendingResponses.shift() as SmtpResponse;
    }

    return new Promise<SmtpResponse>((resolve, reject) => {
      this.pendingReaders.push({
        reject,
        resolve,
      });
    });
  }

  private flushResponse(response: SmtpResponse) {
    const reader = this.pendingReaders.shift();

    if (reader) {
      reader.resolve(response);
      return;
    }

    this.pendingResponses.push(response);
  }

  private failPending(error: Error) {
    while (this.pendingReaders.length > 0) {
      const reader = this.pendingReaders.shift();
      reader?.reject(error);
    }
  }

  private onClose() {
    this.failPending(new Error("SMTP connection closed unexpectedly."));
  }

  private onData(chunk: Buffer | string) {
    this.buffer += chunk.toString();

    while (true) {
      const lineBreakIndex = this.buffer.indexOf("\n");

      if (lineBreakIndex === -1) {
        return;
      }

      const line = this.buffer.slice(0, lineBreakIndex).replace(/\r$/, "");
      this.buffer = this.buffer.slice(lineBreakIndex + 1);

      if (!line) {
        continue;
      }

      this.currentLines.push(line);

      if (/^\d{3} /.test(line)) {
        this.flushResponse({
          code: Number(line.slice(0, 3)),
          lines: this.currentLines,
        });
        this.currentLines = [];
      }
    }
  }

  private onError(error: Error) {
    this.failPending(error);
  }
}

async function sendEhlo(connection: SmtpConnection, heloHost: string) {
  connection.writeLine(`EHLO ${heloHost}`);
  return connection.expectResponse([250]);
}

async function authenticate({
  connection,
  password,
  username,
  supportedMethods,
}: {
  connection: SmtpConnection;
  password: string;
  supportedMethods: Set<string>;
  username: string;
}) {
  if (supportedMethods.has("PLAIN")) {
    const credentials = Buffer.from(`\u0000${username}\u0000${password}`).toString("base64");
    connection.writeLine(`AUTH PLAIN ${credentials}`);
    await connection.expectResponse([235]);
    return;
  }

  if (supportedMethods.has("LOGIN")) {
    connection.writeLine("AUTH LOGIN");
    await connection.expectResponse([334]);
    connection.writeLine(Buffer.from(username).toString("base64"));
    await connection.expectResponse([334]);
    connection.writeLine(Buffer.from(password).toString("base64"));
    await connection.expectResponse([235]);
    return;
  }

  throw new Error("SMTP server does not support AUTH PLAIN or AUTH LOGIN.");
}

export async function sendEmailViaSmtp({
  from,
  fromName,
  heloHost = "localhost",
  host,
  password,
  port,
  secure = port === 465,
  subject,
  text,
  to,
  username,
}: SendEmailViaSmtpInput) {
  let socket = await connectSocket({
    host,
    port,
    secure,
  });
  let connection = new SmtpConnection(socket);

  try {
    await connection.expectResponse([220]);

    let ehloResponse = await sendEhlo(connection, heloHost);
    let capabilities = parseCapabilities(ehloResponse.lines);

    if (!secure && capabilities.includes("STARTTLS")) {
      connection.writeLine("STARTTLS");
      await connection.expectResponse([220]);
      connection.detach();

      socket = await upgradeSocketToTls(socket as net.Socket, host);
      connection = new SmtpConnection(socket);

      ehloResponse = await sendEhlo(connection, heloHost);
      capabilities = parseCapabilities(ehloResponse.lines);
    }

    if (username) {
      await authenticate({
        connection,
        password: password ?? "",
        supportedMethods: getSupportedAuthMethods(capabilities),
        username,
      });
    }

    connection.writeLine(`MAIL FROM:<${from}>`);
    await connection.expectResponse([250]);

    connection.writeLine(`RCPT TO:<${to}>`);
    await connection.expectResponse([250, 251]);

    connection.writeLine("DATA");
    await connection.expectResponse([354]);

    const message = buildMessage({
      from,
      fromName,
      host,
      subject,
      text,
      to,
    });
    connection.writeRaw(`${escapeSmtpBody(message)}\r\n.\r\n`);
    await connection.expectResponse([250]);

    connection.writeLine("QUIT");
    await connection.expectResponse([221]);
  } finally {
    connection.detach();
    socket.end();
  }
}
