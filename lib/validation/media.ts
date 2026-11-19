import sharp from "sharp";
import { fileTypeFromBuffer } from "file-type";
import { HttpError } from "../http";
import { imageIssue } from "./photo";
import { maxBytes } from "../model";
export async function optimizeImage(file: File, thumb = true) {
  const issue = imageIssue(file);
  if (issue) throw new HttpError(issue, 400);
  const bytes = Buffer.from(await file.arrayBuffer());
  try {
    const type = await fileTypeFromBuffer(bytes);
    if (type?.mime !== file.type) throw Error();
    const decoder = sharp(bytes, {
      limitInputPixels: 32_000_000,
      failOn: "warning",
    }).rotate();
    const main = await decoder
      .clone()
      .resize({
        width: 1920,
        height: 1920,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 83 })
      .toBuffer();
    const small = thumb
      ? await decoder
          .clone()
          .resize({
            width: 640,
            height: 640,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: 78 })
          .toBuffer()
      : null;
    return { main, small };
  } catch {
    throw new HttpError(
      "Ảnh bị hỏng, sai định dạng hoặc vượt quá 32 triệu điểm ảnh.",
      400,
    );
  }
}
export async function validateMp3(file: File) {
  if (
    !file.size ||
    file.size > maxBytes ||
    !["audio/mpeg", "audio/mp3"].includes(file.type)
  )
    throw new HttpError("Chỉ nhận tệp MP3 tối đa 4 MB.", 400);
  const b = Buffer.from(await file.arrayBuffer());
  const type = await fileTypeFromBuffer(b).catch(() => null);
  if (type?.ext !== "mp3")
    throw new HttpError("Nội dung tệp không phải MP3.", 400);
  return b;
}
