import { AdminAccountsPage } from "@/features/admin/components/admin-accounts-page";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    specialistStatus?: string;
    role?: string;
  }>;
}) {
  return <AdminAccountsPage searchParams={searchParams} section="users" />;
}
