import { AccountSectionShell } from "@/components/layout/account-section-shell";
import { HistoryPageHeader } from "@/components/layout/history-page-header";
import { ContentPlaceholder } from "@/components/ui/content-placeholder";

export default function SearchPage() {
  return (
    <AccountSectionShell
      activeSection={null}
      header={<HistoryPageHeader title="Поиск" />}
      contentClassName="flex w-full min-w-0 flex-col gap-4"
    >
      <ContentPlaceholder
        title="Поиск скоро появится"
        description="Здесь можно будет искать посты, темы и специалистов."
      />
    </AccountSectionShell>
  );
}
