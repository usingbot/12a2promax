import { randomUUID } from "node:crypto";
import { adminSession } from "@/lib/supabase/server";
import { sameOrigin, readForm, HttpError, failure } from "@/lib/http";
import { parseSettings } from "@/lib/validation/settings";
import { optimizeImage, validateMp3 } from "@/lib/validation/media";
import { put, enqueueRemoval, drainCleanup } from "@/lib/storage";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const session = await adminSession();
    if (!session)
      throw new HttpError("Vui lòng đăng nhập bằng tài khoản quản trị.", 403);
    const form = await readForm(req),
      mode = form.get("mode"),
      version = form.get("version");
    if (typeof version !== "string" || !Number.isFinite(Date.parse(version)))
      throw new HttpError("Phiên bản cấu hình không hợp lệ.", 400);
    const changes: Record<string, unknown> = {};
    let newPath: string | null = null,
      field: string | null = null;
    if (mode === "fields") {
      try {
        Object.assign(
          changes,
          parseSettings(JSON.parse(String(form.get("values")))),
        );
      } catch (e) {
        throw new HttpError(
          e instanceof SyntaxError
            ? "Nội dung không hợp lệ."
            : (e as Error).message,
          400,
        );
      }
      if (form.get("reset_background") === "yes")
        changes.background_image_path = null;
    } else if (mode === "background" || mode === "music") {
      field = mode === "music" ? "music_path" : "background_image_path";
      if (form.get("remove") === "yes") {
        changes[field] = null;
        if (mode === "music") changes.music_enabled = false;
      } else {
        const file = form.get("file");
        if (!(file instanceof File))
          throw new HttpError("Hãy chọn tệp cần tải lên.", 400);
        const bytes =
          mode === "music"
            ? await validateMp3(file)
            : (await optimizeImage(file, false)).main;
        newPath = randomUUID() + (mode === "music" ? ".mp3" : ".webp");
        await put(
          "theme",
          newPath,
          bytes,
          mode === "music" ? "audio/mpeg" : "image/webp",
        );
        changes[field] = newPath;
        if (mode === "music") changes.music_enabled = true;
      }
    } else throw new HttpError("Thao tác không hợp lệ.", 400);
    const result = await session.db
      .from("site_settings")
      .update(changes)
      .eq("id", 1)
      .eq("updated_at", version)
      .select("*")
      .maybeSingle();
    if (result.error || !result.data) {
      if (newPath && field) {
        const check = await session.db
          .from("site_settings")
          .select("*")
          .eq("id", 1)
          .single();
        if (!check.error && check.data?.[field] === newPath)
          return Response.json({ settings: check.data });
        if (!check.error) {
          await enqueueRemoval("theme", [newPath]);
          await drainCleanup();
        }
      }
      if (result.error) throw result.error;
      throw new HttpError(
        "Cài đặt đã được thay đổi ở phiên khác. Hãy tải lại trang.",
        409,
      );
    }
    await drainCleanup();
    return Response.json({ settings: result.data });
  } catch (e) {
    return failure(e);
  }
}
