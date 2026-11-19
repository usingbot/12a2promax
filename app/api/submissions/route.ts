import { createHmac, randomUUID } from "node:crypto";
import { isIP } from "node:net";
import { canSubmit, privilegedDb } from "@/lib/supabase/server";
import { optimizeImage } from "@/lib/validation/media";
import { parseMetadata, uuidPattern } from "@/lib/validation/photo";
import { HttpError, failure, readForm, sameOrigin } from "@/lib/http";
import { drainCleanup, enqueueRemoval, put } from "@/lib/storage";
import { thumbPath } from "@/lib/media";

export async function POST(req: Request) {
  try {
    sameOrigin(req);
    if (!canSubmit())
      throw new HttpError("Kho ảnh chưa sẵn sàng nhận kỷ niệm.", 503);
    const secret = process.env.UPLOAD_RATE_LIMIT_SECRET!;
    const db = privilegedDb();
    const ip =
      process.env.VERCEL === "1"
        ? req.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim()
        : null;
    const key = createHmac("sha256", secret)
      .update(ip && isIP(ip) ? ip : "shared")
      .digest("hex");
    const limit = await db.rpc("consume_upload_quota", { p_key: key });
    if (limit.error) throw limit.error;
    if (!limit.data)
      throw new HttpError(
        "Bạn đã gửi nhiều ảnh trong giờ qua. Hãy quay lại sau.",
        429,
      );
    const form = await readForm(req),
      file = form.get("file"),
      nonce = form.get("request_id");
    if (
      !(file instanceof File) ||
      typeof nonce !== "string" ||
      !uuidPattern.test(nonce)
    )
      throw new HttpError("Thiếu ảnh hoặc mã lần gửi.", 400);
    let metadata: ReturnType<typeof parseMetadata>;
    try {
      metadata = parseMetadata(form);
    } catch (e) {
      throw new HttpError((e as Error).message, 400);
    }
    const { main, small } = await optimizeImage(file);
    const hash = createHmac("sha256", secret)
      .update(nonce)
      .update(main)
      .digest("hex");
    const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
    const prior = await db
      .from("photos")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (prior.error) throw prior.error;
    if (prior.data) return Response.json({ received: true });
    const path = randomUUID() + ".webp",
      paths = [path, thumbPath(path)];
    try {
      await put("memories", path, main, "image/webp");
      await put("memories", paths[1], small!, "image/webp");
    } catch (e) {
      await enqueueRemoval("memories", paths);
      await drainCleanup();
      throw e;
    }
    const { error } = await db
      .from("photos")
      .insert({ ...metadata, id, storage_path: path, status: "pending" });
    if (error) {
      // A lost HTTP response can follow a committed INSERT. Reconcile before deleting objects.
      const check = await db
        .from("photos")
        .select("storage_path")
        .eq("id", id)
        .maybeSingle();
      if (check.error) throw error;
      if (check.data?.storage_path !== path) {
        await enqueueRemoval("memories", paths);
        await drainCleanup();
      }
      if (!check.data) throw error;
    }
    return Response.json({ received: true }, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
