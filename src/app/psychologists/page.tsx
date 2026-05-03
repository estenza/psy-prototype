import { AccountSectionShell } from "@/components/layout/account-section-shell";
import { HistoryPageHeader } from "@/components/layout/history-page-header";
import { ContentPlaceholder } from "@/components/ui/content-placeholder";

export default function PsychologistsPage() {
  return (
    <AccountSectionShell
      activeSection="psychologists"
      header={<HistoryPageHeader title="Психологи" />}
      contentClassName="flex w-full min-w-0 flex-col gap-0"
    >
      <ContentPlaceholder
        title="Психологи скоро появятся"
        description="Здесь будет каталог специалистов, которым можно доверить свои вопросы и состояния."
      />
    </AccountSectionShell>
  );
}
