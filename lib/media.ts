import "server-only";
import {
  adminSession,
  configured,
  privilegedDb,
  publicDb,
} from "./supabase/server";
import { uuidPattern } from "./validation/photo";
export const thumbPath = (path: string) =>
  path.replace(/\.webp$/, ".small.webp");
export async function photoResponse(id: string, small: boolean, admin = false) {
  if (!uuidPattern.test(id) || !configured())
    return new Response(null, { status: 404 });
  const session = admin ? await adminSession() : null;
  if (admin && !session) return new Response(null, { status: 403 });
  let query = (session?.db ?? publicDb())
    .from("photos")
    .select("storage_path")
    .eq("id", id);
  if (!admin) query = query.eq("status", "approved");
  const { data, error } = await query.maybeSingle();
  if (error) return new Response(null, { status: 503 });
  if (!data) return new Response(null, { status: 404 });
  return storageResponse(
    "memories",
    small ? thumbPath(data.storage_path) : data.storage_path,
  );
}
export async function storageResponse(
  bucket: string,
  path: string,
  request?: Request,
) {
  const db = privilegedDb();
  const { data: link, error } = await db.storage
    .from(bucket)
    .createSignedUrl(path, 60);
  if (error || !link) return new Response(null, { status: 404 });
  const range = request?.headers.get("range");
  const response = await fetch(link.signedUrl, {
    cache: "no-store",
    headers: range ? { Range: range } : {},
  });
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  for (const name of [
    "Content-Type",
    "Content-Length",
    "Content-Range",
    "Accept-Ranges",
  ]) {
    const v = response.headers.get(name);
    if (v) headers.set(name, v);
  }
  return new Response(response.body, { headers, status: response.status });
}
