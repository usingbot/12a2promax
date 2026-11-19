import "server-only";
import { privilegedDb } from "./supabase/server";
export async function put(
  bucket: string,
  path: string,
  bytes: Buffer,
  type: string,
) {
  const { error } = await privilegedDb()
    .storage.from(bucket)
    .upload(path, bytes, {
      contentType: type,
      upsert: false,
      cacheControl: "0",
    });
  if (error) throw error;
}
export async function enqueueRemoval(bucket: string, paths: string[]) {
  if (!paths.length) return;
  const db = privilegedDb();
  await db.from("asset_cleanup").upsert(
    paths.map((path) => ({ bucket, path })),
    { onConflict: "bucket,path", ignoreDuplicates: true },
  );
}
export async function drainCleanup() {
  const db = privilegedDb();
  const { data } = await db
    .from("asset_cleanup")
    .select("bucket,path")
    .order("created_at")
    .limit(60);
  for (const bucket of ["memories", "theme"]) {
    const paths = (data ?? [])
      .filter((x) => x.bucket === bucket)
      .map((x) => x.path);
    if (!paths.length) continue;
    const { error } = await db.storage.from(bucket).remove(paths);
    if (!error)
      await db
        .from("asset_cleanup")
        .delete()
        .eq("bucket", bucket)
        .in("path", paths);
  }
}
