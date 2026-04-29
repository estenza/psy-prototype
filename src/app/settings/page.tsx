import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { DEFAULT_SETTINGS_SECTION } from "@/features/auth/lib/settings-navigation";

export default async function SettingsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/");
  }

  redirect(DEFAULT_SETTINGS_SECTION.href);
}
