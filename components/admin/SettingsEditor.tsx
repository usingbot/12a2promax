"use client";
import { useState } from "react";
import {
  Check,
  Feather,
  Image as ImageIcon,
  Layers2,
  Music2,
  RotateCcw,
  Save,
} from "lucide-react";
import { defaults, presets, maxBytes, type Settings } from "@/lib/model";
type Panel = "content" | "background" | "music" | "animation";
type Numeric = keyof Pick<
  Settings,
  | "overlay_opacity"
  | "default_volume"
  | "floating_speed"
  | "floating_intensity"
  | "floating_photo_size"
  | "shadow_intensity"
  | "max_visible_photos"
>;
const sections = [
  ["content", "Nội dung", Feather],
  ["background", "Phông nền", ImageIcon],
  ["music", "Âm nhạc", Music2],
  ["animation", "Chuyển động", Layers2],
] as const;
export default function SettingsEditor({ initial }: { initial: Settings }) {
  const [saved, setSaved] = useState(initial),
    [draft, setDraft] = useState(initial),
    [panel, setPanel] = useState<Panel>("content"),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [reset, setReset] = useState(false);
  function change<K extends keyof Settings>(key: K, value: Settings[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setNotice("");
  }
  async function save(form: FormData) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    form.set("version", saved.updated_at);
    try {
      const r = await fetch("/api/admin/settings", {
          method: "POST",
          body: form,
        }),
        json = await r.json();
      if (!r.ok) throw Error(json.error);
      const updated = json.settings as Settings;
      setSaved(updated);
      if (form.get("mode") === "fields") {
        setDraft(updated);
        setReset(false);
      } else {
        setDraft((d) => ({
          ...d,
          background_image_path: updated.background_image_path,
          music_path: updated.music_path,
          music_enabled: updated.music_enabled,
          updated_at: updated.updated_at,
        }));
      }
      setNotice("Đã lưu cài đặt. Trang chủ sẽ dùng cấu hình mới khi mở lại.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chưa lưu được cài đặt.");
    } finally {
      setBusy(false);
    }
  }
  function asset(mode: "music" | "background", file?: File) {
    if (file && (!file.size || file.size > maxBytes)) {
      setError("Mỗi tệp có dung lượng tối đa 4 MB.");
      return;
    }
    const f = new FormData();
    f.set("mode", mode);
    if (file) f.set("file", file);
    else f.set("remove", "yes");
    void save(f);
  }
  function slider(
    key: Numeric,
    label: string,
    min: number,
    max: number,
    step = 1,
    unit = "",
  ) {
    return (
      <label className="slider-field" key={key}>
        <span>
          {label}
          <output>
            {draft[key]}
            {unit}
          </output>
        </span>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={draft[key]}
          onChange={(e) => change(key, +e.target.value)}
        />
      </label>
    );
  }
  function toggle(
    key: "music_enabled" | "rotation_enabled" | "floating_enabled",
    label: string,
  ) {
    return (
      <label className="check-field">
        <input
          type="checkbox"
          checked={draft[key]}
          onChange={(e) => change(key, e.target.checked)}
        />
        {label}
      </label>
    );
  }
  return (
    <div className="settings-layout">
      <nav className="settings-nav" aria-label="Nhóm cài đặt">
        {sections.map(([id, name, Icon]) => (
          <button
            key={id}
            aria-pressed={id === panel}
            onClick={() => setPanel(id)}
          >
            <Icon size={18} />
            {name}
          </button>
        ))}
      </nav>
      <form
        className="settings-panel"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData();
          f.set("mode", "fields");
          f.set("values", JSON.stringify(draft));
          if (reset) f.set("reset_background", "yes");
          void save(f);
        }}
      >
        <fieldset disabled={busy}>
          <legend>{sections.find(([id]) => id === panel)?.[1]}</legend>
          {panel === "content" &&
            (
              [
                ["site_title", "Tiêu đề chính", 150],
                ["site_subtitle", "Phụ đề", 350],
                ["welcome_message", "Lời chào trong album", 240],
                ["footer_text", "Lời nhắn cuối trang", 240],
              ] as const
            ).map(([key, label, max]) => (
              <label className="field" key={key}>
                {label}
                <textarea
                  value={draft[key]}
                  maxLength={max}
                  required
                  rows={2}
                  onChange={(e) => change(key, e.target.value)}
                />
              </label>
            ))}
          {panel === "background" && (
            <>
              <div className="field">
                Mẫu nền
                <div className="preset-list">
                  {(
                    Object.entries(presets) as [keyof typeof presets, string][]
                  ).map(([key, color]) => (
                    <button
                      type="button"
                      key={key}
                      aria-pressed={draft.background_preset === key}
                      onClick={() => {
                        setDraft((d) => ({
                          ...d,
                          background_preset: key,
                          background_color: color,
                        }));
                        setReset(true);
                      }}
                    >
                      <i style={{ background: color }} />
                      {
                        {
                          plum: "Mận chín",
                          forest: "Rừng xưa",
                          sepia: "Nâu phim",
                        }[key]
                      }
                    </button>
                  ))}
                </div>
              </div>
              <label className="field">
                Màu nền
                <input
                  type="color"
                  value={draft.background_color}
                  onChange={(e) => change("background_color", e.target.value)}
                />
              </label>
              {slider("overlay_opacity", "Độ đậm lớp phủ ảnh", 0, 90, 1, "%")}
              <label className="field">
                Tải và dùng ảnh nền ngay{" "}
                <small>JPEG, PNG, WebP · Tối đa 4 MB</small>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setReset(false);
                      asset("background", file);
                    }
                    e.target.value = "";
                  }}
                />
              </label>
              {saved.background_image_path && (
                <p className="status-note">Đang dùng ảnh nền của lớp.</p>
              )}
              <button
                type="button"
                className="outline"
                onClick={() => {
                  setDraft((d) => ({
                    ...d,
                    background_color: defaults.background_color,
                    background_preset: defaults.background_preset,
                    overlay_opacity: defaults.overlay_opacity,
                  }));
                  setReset(true);
                  setNotice("Nhấn Lưu thay đổi để khôi phục nền mặc định.");
                }}
              >
                <RotateCcw size={15} />
                Khôi phục nền mặc định
              </button>
            </>
          )}
          {panel === "music" && (
            <>
              {toggle("music_enabled", "Cho phép phát nhạc nền")}
              {slider("default_volume", "Âm lượng mặc định", 0, 100, 1, "%")}
              <p className="notice">
                Bản nhạc hiện tại ·{" "}
                {saved.music_path ? "Nhạc của lớp" : "Chiều sân trường"}. Nhạc
                bắt đầu khi người xem bấm Bật nhạc.
              </p>
              <label className="field">
                Tải và dùng bản nhạc ngay <small>MP3 · Tối đa 4 MB</small>
                <input
                  type="file"
                  accept="audio/mpeg,.mp3"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) asset("music", file);
                    e.target.value = "";
                  }}
                />
              </label>
              {saved.music_path && (
                <button
                  type="button"
                  className="outline"
                  onClick={() => asset("music")}
                >
                  Gỡ bản nhạc đã tải
                </button>
              )}
            </>
          )}
          {panel === "animation" && (
            <>
              {toggle("floating_enabled", "Cho phép ảnh trôi")}
              {toggle("rotation_enabled", "Xoay nhẹ khung ảnh")}
              {slider("floating_speed", "Tốc độ trôi", 0.25, 3, 0.25, "×")}
              {slider(
                "floating_intensity",
                "Biên độ chuyển động",
                0,
                2,
                0.1,
                "×",
              )}
              {slider("floating_photo_size", "Kích thước ảnh", 65, 125, 1, "%")}
              {slider("max_visible_photos", "Số ảnh trôi tối đa", 1, 12)}
              {slider("shadow_intensity", "Độ đậm bóng khung", 0, 100, 1, "%")}
            </>
          )}
        </fieldset>
        {notice && (
          <p className="status-note" role="status">
            <Check size={15} /> {notice}
          </p>
        )}
        {error && (
          <p className="error-note" role="alert">
            {error}
          </p>
        )}
        <button className="primary" disabled={busy}>
          <Save size={16} />
          {busy ? "Đang lưu…" : "Lưu thay đổi"}
        </button>
      </form>
    </div>
  );
}
