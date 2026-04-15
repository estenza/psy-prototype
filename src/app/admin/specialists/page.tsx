import { AdminAccountsPage } from "@/features/admin/components/admin-accounts-page";

export default async function AdminSpecialistsPage({
  searchParams,
}: {
  searchParams: Promise<{
    specialistStatus?: string;
  }>;
}) {
  return <AdminAccountsPage searchParams={searchParams} section="specialists" />;
}
