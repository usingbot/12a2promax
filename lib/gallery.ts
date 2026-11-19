import "server-only";
import { canSubmit, configured, publicDb } from "./supabase/server";
import { defaults, type Photo, type Settings } from "./model";

export const photoFields = "id,caption,uploader_name,memory_date,created_at";
export type PhotoRow = Pick<
  Photo,
  "id" | "caption" | "uploader_name" | "memory_date" | "created_at"
>;
export function photoView(row: PhotoRow, admin = false): Photo {
  const src = `/api/${admin ? "admin/" : ""}photos/${row.id}`;
  return { ...row, src, thumbnail: src + "?size=small" };
}
export async function publicPhotos(offset = 0) {
  const { data, error, count } = await publicDb()
    .from("photos")
    .select(photoFields, { count: "exact" })
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + 23);
  if (error) throw error;
  return { photos: (data ?? []).map((p) => photoView(p)), total: count ?? 0 };
}
export async function getGallery() {
  const fallback = {
    photos: [] as Photo[],
    total: 0,
    settings: defaults,
    uploadAvailable: false,
  };
  if (!configured())
    return { ...fallback, connection: "unconfigured" as const };
  try {
    const [page, settings] = await Promise.all([
      publicPhotos(),
      publicDb().from("site_settings").select("*").eq("id", 1).single(),
    ]);
    if (settings.error) throw settings.error;
    return {
      ...page,
      settings: { ...defaults, ...settings.data } as Settings,
      connection: "ready" as const,
      uploadAvailable: canSubmit(),
    };
  } catch {
    return { ...fallback, connection: "offline" as const };
  }
}
