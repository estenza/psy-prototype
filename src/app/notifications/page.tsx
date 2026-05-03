import { redirect } from "next/navigation";
import { AccountSectionShell } from "@/components/layout/account-section-shell";
import { HistoryPageHeader } from "@/components/layout/history-page-header";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { NotificationsPageContent } from "@/features/notifications/components/notifications-page-content";
import { getNotificationsOverview } from "@/features/notifications/lib/notifications-service";

export default async function NotificationsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/");
  }

  const { notifications, unreadCount } = await getNotificationsOverview(currentUser);

  return (
    <AccountSectionShell
      activeSection={null}
      header={<HistoryPageHeader title="Уведомления" />}
      contentClassName="flex w-full min-w-0 flex-col gap-0"
    >
      <NotificationsPageContent
        initialNotifications={notifications}
        initialUnreadCount={unreadCount}
      />
    </AccountSectionShell>
  );
}
