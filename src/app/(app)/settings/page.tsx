import { getProfile } from "@/lib/auth";
import SettingsForm from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { profile } = await getProfile();
  return <SettingsForm profile={profile} />;
}
