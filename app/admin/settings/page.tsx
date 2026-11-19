import { redirect } from "next/navigation";
import { adminSession } from "@/lib/supabase/server";
import { defaults, type Settings } from "@/lib/model";
import Shell from "@/components/admin/Shell";
import SettingsEditor from "@/components/admin/SettingsEditor";
export const dynamic = "force-dynamic";
export default async function SettingsPage() {
  const session = await adminSession();
  if (!session) redirect("/admin/login");
  const { data, error } = await session.db
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) throw error;
  return (
    <Shell active="settings">
      <h1 className="admin-title">Cài đặt lưu bút</h1>
      <SettingsEditor initial={{ ...defaults, ...data } as Settings} />
    </Shell>
  );
}
