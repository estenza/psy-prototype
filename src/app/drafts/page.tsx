import { redirect } from "next/navigation";
import { AccountSectionShell } from "@/components/layout/account-section-shell";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { DraftsOverviewCard } from "@/features/topic-creation/components/drafts-overview-card";

export default async function DraftsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/");
  }

  return (
    <AccountSectionShell
      activeSection="drafts"
      title="Черновики"
      description="Быстрый доступ к сохранённым локально наброскам постов."
    >
      <DraftsOverviewCard />
    </AccountSectionShell>
  );
}
