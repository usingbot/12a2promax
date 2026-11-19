import { adminSession } from "@/lib/supabase/server";
import { HttpError, sameOrigin, failure } from "@/lib/http";
import { uuidPattern } from "@/lib/validation/photo";
import { drainCleanup } from "@/lib/storage";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const session = await adminSession();
    if (!session)
      throw new HttpError("Bạn cần đăng nhập bằng tài khoản quản trị.", 403);
    const body = await req.json(),
      ids = body?.ids;
    if (
      !Array.isArray(ids) ||
      !ids.length ||
      ids.length > 50 ||
      !ids.every((x) => typeof x === "string" && uuidPattern.test(x))
    )
      throw new HttpError("Danh sách ảnh không hợp lệ.", 400);
    const photos = session.db.from("photos");
    let mutation;
    switch (body.action) {
      case "approved":
      case "rejected":
        mutation = photos.update({ status: body.action });
        break;
      case "caption": {
        if (
          typeof body.caption !== "string" ||
          !body.caption.trim() ||
          body.caption.trim().length > 1000 ||
          ids.length !== 1
        )
          throw new HttpError("Lời nhắn cần từ 1 đến 1.000 ký tự.", 400);
        mutation = photos.update({ caption: body.caption.trim() });
        break;
      }
      case "delete":
        mutation = photos.delete();
        break;
      default:
        throw new HttpError("Thao tác không hợp lệ.", 400);
    }
    const { error, data } = await mutation.in("id", ids).select("id");
    if (error) throw error;
    if (body.action === "delete") await drainCleanup();
    return Response.json({ count: data?.length ?? 0 });
  } catch (e) {
    return failure(e);
  }
}
