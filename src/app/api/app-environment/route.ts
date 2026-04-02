import { NextResponse } from "next/server";
import { getAppEnvironment, isStagingEnvironment } from "@/lib/app-env";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      appEnv: getAppEnvironment(),
      isStaging: isStagingEnvironment(),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}
