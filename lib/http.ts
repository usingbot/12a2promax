export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
export function failure(error: unknown) {
  return Response.json(
    {
      error:
        error instanceof HttpError
          ? error.message
          : "Kết nối bị gián đoạn. Vui lòng thử lại.",
    },
    { status: error instanceof HttpError ? error.status : 503 },
  );
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (
    !origin ||
    (origin !== new URL(req.url).origin &&
      new URL(origin).host !== req.headers.get("host"))
  )
    throw new HttpError("Yêu cầu không hợp lệ.", 403);
}
export async function readForm(
  req: Request,
  limit = 4 * 1024 * 1024 + 64 * 1024,
) {
  if (!req.headers.get("content-type")?.startsWith("multipart/form-data"))
    throw new HttpError("Định dạng biểu mẫu không hợp lệ.", 415);
  if (Number(req.headers.get("content-length")) > limit)
    throw new HttpError("Tệp quá lớn.", 413);
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError("Thiếu dữ liệu.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        throw new HttpError("Tệp quá lớn.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return await new Response(Buffer.concat(chunks), {
      headers: { "content-type": req.headers.get("content-type")! },
    }).formData();
  } catch {
    throw new HttpError("Không đọc được biểu mẫu.", 400);
  }
}
