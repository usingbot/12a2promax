import { publicDb, configured } from "@/lib/supabase/server";
import { storageResponse } from "@/lib/media";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ asset: string }> },
) {
  const { asset } = await params;
  if (!configured() || !["music", "background"].includes(asset))
    return new Response(null, { status: 404 });
  const { data } = await publicDb()
    .from("site_settings")
    .select("music_enabled,music_path,background_image_path")
    .eq("id", 1)
    .maybeSingle();
  const path =
    asset === "music"
      ? data?.music_enabled && data.music_path
      : data?.background_image_path;
  return path
    ? storageResponse("theme", path, req)
    : new Response(null, { status: 404 });
}
