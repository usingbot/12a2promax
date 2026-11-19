import { publicPhotos } from "@/lib/gallery";
export async function GET(req: Request) {
  const offset = Number(new URL(req.url).searchParams.get("offset") ?? 0);
  if (!Number.isSafeInteger(offset) || offset < 0)
    return Response.json({ error: "Trang không hợp lệ." }, { status: 400 });
  try {
    return Response.json(await publicPhotos(offset), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { error: "Chưa tải được ảnh. Vui lòng thử lại." },
      { status: 503 },
    );
  }
}
