export type Status = "pending" | "approved" | "rejected";

export interface Photo {
  id: string;
  caption: string;
  uploader_name: string;
  memory_date: string | null;
  created_at: string;
  src: string;
  thumbnail: string;
  demo?: boolean;
}

export interface Settings {
  site_title: string;
  site_subtitle: string;
  welcome_message: string;
  footer_text: string;
  background_preset: "plum" | "forest" | "sepia";
  background_color: string;
  background_image_path: string | null;
  overlay_opacity: number;
  music_path: string | null;
  music_enabled: boolean;
  default_volume: number;
  floating_speed: number;
  floating_intensity: number;
  floating_photo_size: number;
  max_visible_photos: number;
  shadow_intensity: number;
  rotation_enabled: boolean;
  floating_enabled: boolean;
  updated_at: string;
}

export const defaults: Settings = {
  site_title: "12A2 — Chúng ta của những năm tháng ấy",
  site_subtitle:
    "Có những khoảnh khắc chỉ diễn ra một lần, nhưng sẽ ở lại mãi trong ký ức.",
  welcome_message: "Mỗi bức ảnh, một câu chuyện của chúng mình.",
  footer_text: "Dành cho 12A2, với tất cả thương yêu.",
  background_preset: "plum",
  background_color: "#382031",
  background_image_path: null,
  overlay_opacity: 35,
  music_path: null,
  music_enabled: true,
  default_volume: 35,
  floating_speed: 1,
  floating_intensity: 1,
  floating_photo_size: 100,
  max_visible_photos: 8,
  shadow_intensity: 50,
  rotation_enabled: true,
  floating_enabled: true,
  updated_at: "",
};

const examples = [
  ["schoolyard", "Sân trường năm ấy"],
  ["classroom", "Một chiều trong lớp"],
  ["bicycles", "Mùa hạ cuối cùng"],
  ["friends", "Có nhau, có thanh xuân"],
  ["blackboard", "Góc bảng thân quen"],
  ["notebook", "Những dòng lưu bút"],
];
export const demoPhotos: Photo[] = examples.map(([file, caption]) => ({
  id: file,
  caption,
  uploader_name: "Bộ ảnh minh họa",
  memory_date: null,
  created_at: "",
  src: `/demo/${file}.webp`,
  thumbnail: `/demo/${file}.webp`,
  demo: true,
}));
export function dateLabel(date: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(date));
}
export const presets = { plum: "#382031", forest: "#2d4035", sepia: "#533c30" };
export const maxBytes = 4 * 1024 * 1024;
export const imageTypes = ["image/jpeg", "image/png", "image/webp"];
