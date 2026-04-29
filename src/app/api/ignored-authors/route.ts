import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import {
  IgnoredAuthorRepositoryError,
  ignoreAuthor,
  unignoreAuthor,
} from "@/features/auth/lib/ignored-authors-repository";

export const runtime = "nodejs";

type IgnoredAuthorPayload = {
  ignoredUserId?: string;
};

async function readIgnoredAuthorId(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as IgnoredAuthorPayload | null;
  return payload?.ignoredUserId?.trim() || null;
}

function buildErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof IgnoredAuthorRepositoryError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : fallbackMessage,
    },
    {
      status: 500,
    },
  );
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Нужно войти в аккаунт." },
        { status: 401 },
      );
    }

    const ignoredUserId = await readIgnoredAuthorId(request);

    if (!ignoredUserId) {
      return NextResponse.json(
        { error: "Автор не найден." },
        { status: 400 },
      );
    }

    const ignoredAuthor = await ignoreAuthor(currentUser.id, ignoredUserId);

    return NextResponse.json({
      ignoredAuthor,
      ok: true,
    });
  } catch (error) {
    return buildErrorResponse(error, "Не удалось обновить игнор-лист.");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Нужно войти в аккаунт." },
        { status: 401 },
      );
    }

    const ignoredUserId = await readIgnoredAuthorId(request);

    if (!ignoredUserId) {
      return NextResponse.json(
        { error: "Автор не найден." },
        { status: 400 },
      );
    }

    await unignoreAuthor(currentUser.id, ignoredUserId);

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    return buildErrorResponse(error, "Не удалось обновить игнор-лист.");
  }
}
