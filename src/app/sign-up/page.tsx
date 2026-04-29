import { redirect } from "next/navigation";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const nextPath = resolvedSearchParams.next?.trim() || "/";

  redirect(`/sign-in?next=${encodeURIComponent(nextPath)}`);
}
