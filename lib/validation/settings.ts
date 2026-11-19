import { defaults, presets, type Settings } from "../model";
export function parseSettings(input: unknown) {
  if (typeof input !== "object" || !input)
    throw new Error("Cấu hình không hợp lệ.");
  const o = input as Record<string, unknown>;
  function str(key: keyof Settings, max: number) {
    const s = o[key];
    if (typeof s !== "string" || !s.trim() || s.trim().length > max)
      throw new Error("Vui lòng kiểm tra độ dài nội dung.");
    return s.trim();
  }
  function num(key: keyof Settings, min: number, max: number, integer = true) {
    const n = o[key];
    if (
      typeof n !== "number" ||
      !Number.isFinite(n) ||
      n < min ||
      n > max ||
      (integer && !Number.isInteger(n))
    )
      throw new Error("Thông số nằm ngoài phạm vi cho phép.");
    return n;
  }
  function bool(key: keyof Settings) {
    if (typeof o[key] !== "boolean") throw new Error("Tùy chọn không hợp lệ.");
    return o[key] as boolean;
  }
  if (
    typeof o.background_color !== "string" ||
    !/^#[a-f0-9]{6}$/i.test(o.background_color)
  )
    throw new Error("Màu nền không hợp lệ.");
  if (
    typeof o.background_preset !== "string" ||
    !Object.hasOwn(presets, o.background_preset)
  )
    throw new Error("Mẫu nền không hợp lệ.");
  return {
    site_title: str("site_title", 150),
    site_subtitle: str("site_subtitle", 350),
    welcome_message: str("welcome_message", 240),
    footer_text: str("footer_text", 240),
    background_preset: o.background_preset as typeof defaults.background_preset,
    background_color: o.background_color,
    overlay_opacity: num("overlay_opacity", 0, 90),
    music_enabled: bool("music_enabled"),
    default_volume: num("default_volume", 0, 100),
    floating_speed: num("floating_speed", 0.25, 3, false),
    floating_intensity: num("floating_intensity", 0, 2, false),
    floating_photo_size: num("floating_photo_size", 65, 125),
    max_visible_photos: num("max_visible_photos", 1, 12),
    shadow_intensity: num("shadow_intensity", 0, 100),
    rotation_enabled: bool("rotation_enabled"),
    floating_enabled: bool("floating_enabled"),
  };
}
