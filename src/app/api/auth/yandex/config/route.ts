import { NextRequest, NextResponse } from "next/server";
import { buildAuthErrorResponse } from "@/features/auth/lib/auth-http";
import {
  buildYandexTokenRedirectUri,
  readYandexClientId,
} from "@/features/auth/lib/yandex-oauth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const clientId = readYandexClientId();

    if (!clientId) {
      return NextResponse.json({
        enabled: false,
      });
    }

    const redirectUri = buildYandexTokenRedirectUri(request);

    return NextResponse.json({
      clientId,
      enabled: true,
      redirectUri,
      tokenPageOrigin: new URL(redirectUri).origin,
    });
  } catch (error) {
    return buildAuthErrorResponse(error);
  }
}
