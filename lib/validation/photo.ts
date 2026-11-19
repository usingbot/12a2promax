import { imageTypes, maxBytes } from "../model";
export function parseMetadata(form: FormData) {
  const name = form.get("uploader_name"),
    caption = form.get("caption"),
    date = form.get("memory_date") || null;
  if (typeof name !== "string" || !name.trim() || name.trim().length > 80)
    throw new Error("Tên người gửi cần từ 1 đến 80 ký tự.");
  if (
    typeof caption !== "string" ||
    !caption.trim() ||
    caption.trim().length > 1000
  )
    throw new Error("Lời nhắn cần từ 1 đến 1.000 ký tự.");
  if (
    date !== null &&
    (typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date)
  )
    throw new Error("Ngày kỷ niệm không hợp lệ.");
  return {
    uploader_name: name.trim(),
    caption: caption.trim(),
    memory_date: date,
  };
}
export function imageIssue(file: File) {
  if (!imageTypes.includes(file.type))
    return "Chỉ nhận ảnh JPEG, PNG hoặc WebP.";
  if (!file.size || file.size > maxBytes)
    return "Mỗi ảnh phải có dung lượng từ 1 byte đến 4 MB.";
  return null;
}
export const uuidPattern =
  /^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
