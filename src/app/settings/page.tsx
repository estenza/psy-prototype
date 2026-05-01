import { redirect } from "next/navigation";
import { SettingsMenuRouteScreen } from "@/features/auth/components/settings-route-screen";
import { getCurrentUser } from "@/features/auth/lib/current-user";

export default async function SettingsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/");
  }

  return <SettingsMenuRouteScreen />;
}
