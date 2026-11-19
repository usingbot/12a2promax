"use client";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import {
  Aperture,
  KeyRound,
  BookOpen,
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass as CompassIcon,
  Expand,
  Feather,
  ImagePlus,
  Images,
  Layers2,
  Menu,
  Pause,
  Play,
  Shuffle,
  Sparkles,
  X,
} from "lucide-react";
import { defaults, demoPhotos, type Photo, type Settings } from "@/lib/model";
import { Brand, Compass } from "../ui/Mark";
import PhotoImage from "../ui/PhotoImage";
import Viewer from "./Viewer";
import Upload from "../upload/Upload";
import Music from "./Music";
import Sky from "./Sky";
import Polaroid, { welcomeSlots, sceneSlots } from "./Polaroid";

type Props = {
  photos: Photo[];
  total: number;
  settings: Settings;
  connection: "ready" | "unconfigured" | "offline";
  uploadAvailable: boolean;
};
const subscribeMobile = (fn: () => void) => {
  const mq = window.matchMedia("(max-width: 680px)");
  mq.addEventListener("change", fn);
  return () => mq.removeEventListener("change", fn);
};
export default function Scrapbook({
  photos: initial,
  total: initialTotal,
  settings: s,
  connection,
  uploadAvailable,
}: Props) {
  const [photos, setPhotos] = useState(initial),
    [total, setTotal] = useState(initialTotal),
    [entered, setEntered] = useState(false),
    [mode, setMode] = useState<"scene" | "album">("scene"),
    [paused, setPaused] = useState(false),
    [offset, setOffset] = useState(0),
    [selected, setSelected] = useState<Photo | null>(null),
    [upload, setUpload] = useState(false),
    [menu, setMenu] = useState(false),
    [message, setMessage] = useState(""),
    [loading, setLoading] = useState(false);
  const album = useRef<HTMLElement>(null),
    scene = useRef<HTMLElement>(null),
    strip = useRef<HTMLDivElement>(null);
  const mobile = useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia("(max-width: 680px)").matches,
    () => false,
  );
  const demo = photos.length === 0,
    items = demo ? demoPhotos : photos;
  const [otherPage, setOtherPage] = useState<Photo[]>([]);
  const floating = otherPage.length ? otherPage : items;
  const count = Math.min(
    floating.length,
    s.max_visible_photos,
    entered ? (mobile ? 4 : 12) : 4,
  );
  const visible = Array.from(
    { length: count },
    (_, i) => floating[(offset + i) % floating.length],
  );
  const slots = entered ? sceneSlots(count, mobile) : welcomeSlots;
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 4500);
    return () => clearTimeout(t);
  }, [message]);
  const [hidden, setHidden] = useState(false),
    [offscreen, setOffscreen] = useState(false);
  useEffect(() => {
    if (!scene.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) =>
      setOffscreen(!entry.isIntersecting),
    );
    observer.observe(scene.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const fn = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", fn);
    return () => document.removeEventListener("visibilitychange", fn);
  }, []);
  function showAlbum() {
    setMode("album");
    setMenu(false);
    requestAnimationFrame(() =>
      album.current?.scrollIntoView({ block: "start" }),
    );
  }
  function showScene() {
    setMode("scene");
    setMenu(false);
    requestAnimationFrame(() =>
      scene.current?.scrollIntoView({ block: "start" }),
    );
  }
  function send() {
    setMenu(false);
    setUpload(true);
  }
  async function more() {
    setLoading(true);
    try {
      const r = await fetch("/api/photos?offset=" + photos.length);
      if (!r.ok) throw Error();
      const data = (await r.json()) as { photos: Photo[]; total: number };
      setPhotos((prev) =>
        Array.from(
          new Map([...prev, ...data.photos].map((p) => [p.id, p])).values(),
        ),
      );
      setTotal(data.total);
    } catch {
      setMessage("Chưa tải thêm được ảnh. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }
  async function shuffle() {
    if (items.length < 2) return;
    if (!demo && total > 24 && !loading) {
      setLoading(true);
      try {
        const next = Math.floor(Math.random() * Math.ceil(total / 24)) * 24;
        const res = await fetch("/api/photos?offset=" + next);
        if (!res.ok) throw Error();
        const data = (await res.json()) as { photos: Photo[]; total: number };
        setOtherPage(data.photos);
        setTotal(data.total);
      } catch {
        setMessage("Chưa tải thêm được ảnh. Đang trộn các kỷ niệm đã mở.");
      } finally {
        setLoading(false);
      }
    }
    setOffset(
      (n) =>
        n + 1 + Math.floor(Math.random() * Math.max(1, floating.length - 1)),
    );
  }
  useEffect(() => {
    const el = scene.current;
    if (
      !el ||
      paused ||
      !s.floating_enabled ||
      window.matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse)")
        .matches
    )
      return;
    let frame = 0,
      x = 0,
      y = 0;
    const paint = () => {
      el.style.setProperty("--px", x + "px");
      el.style.setProperty("--py", y + "px");
      frame = 0;
    };
    const move = (e: PointerEvent) => {
      const box = el.getBoundingClientRect();
      x = ((e.clientX - box.left) / box.width - 0.5) * 9;
      y = ((e.clientY - box.top) / box.height - 0.5) * 7;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const reset = () => {
      x = 0;
      y = 0;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", reset);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", reset);
      cancelAnimationFrame(frame);
      el.style.removeProperty("--px");
      el.style.removeProperty("--py");
    };
  }, [paused, s.floating_enabled]);
  const style = {
    "--scene-base": s.background_color,
    "--speed": s.floating_speed,
    "--intensity": s.floating_intensity,
    "--scale": s.floating_photo_size / 100,
    "--shadow": s.shadow_intensity / 100,
    "--rot": s.rotation_enabled ? 1 : 0,
  } as CSSProperties;
  return (
    <>
      <header className="topbar">
        <div className="header-inner">
          <Brand />
          <nav
            className={menu ? "nav open" : "nav"}
            aria-label="Điều hướng chính"
          >
            <button
              className={mode === "scene" ? "active" : ""}
              onClick={showScene}
            >
              <CompassIcon />
              Miền ký ức
            </button>
            <button
              className={mode === "album" ? "active" : ""}
              onClick={showAlbum}
            >
              <Images />
              Album ảnh
            </button>
            <button onClick={send}>
              <Feather />
              Gửi kỷ niệm
            </button>
          </nav>
          <div className="header-actions">
            <Music settings={s} />
            <button
              className="menu-toggle icon-button"
              aria-expanded={menu}
              aria-label="Mở trình đơn"
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main>
        <section
          ref={scene}
          id="mien-ky-uc"
          aria-label="Miền ký ức"
          className={`scene ${entered ? "entered" : ""} ${mode === "album" ? "scene-hidden" : ""} ${paused || selected || upload || hidden || offscreen || !s.floating_enabled ? "still" : ""}`}
          style={style}
        >
          <Sky />
          {s.background_image_path && (
            <div
              className="custom-bg"
              style={{
                backgroundImage: `linear-gradient(rgb(30 14 28 / ${s.overlay_opacity}%),rgb(30 14 28 / ${s.overlay_opacity}%)),url(/api/theme/background?v=${encodeURIComponent(s.updated_at)})`,
              }}
            />
          )}
          <div className="stage">
            <div className="stage-tag">
              <span className="tag-dot" />
              {demo ? "Bộ ảnh minh họa" : "Ký ức của lớp"}
            </div>
            {visible.map((p, i) => (
              <Polaroid
                key={i}
                photo={p}
                slot={slots[i]}
                index={i}
                open={() => setSelected(p)}
              />
            ))}
            {!entered ? (
              <div
                className={
                  s.site_subtitle.length > 150
                    ? "letter-holder long-letter"
                    : "letter-holder"
                }
              >
                <div className="letter">
                  <div className="paper-fold" />
                  <div className="paper-content">
                    <div className="year-label">
                      <span />
                      NIÊN KHÓA 2026 – 2027
                      <span />
                    </div>
                    {s.site_title === defaults.site_title ? (
                      <h1>
                        <span className="class-name">12A2</span>
                        <span className="sr-only"> — </span>
                        <span className="title-line">
                          Chúng ta của
                          <br />
                          những năm tháng ấy
                        </span>
                      </h1>
                    ) : (
                      <h1
                        className={
                          s.site_title.length > 80
                            ? "custom-title long-title"
                            : "custom-title"
                        }
                      >
                        {s.site_title}
                      </h1>
                    )}
                    <div className="letter-rule">
                      <i />✧<i />
                    </div>
                    <p>{s.site_subtitle}</p>
                    <button
                      className="entry-btn"
                      onClick={() => setEntered(true)}
                    >
                      <BookOpen size={18} />
                      Bước vào miền ký ức
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button className="back-letter" onClick={() => setEntered(false)}>
                <BookOpen size={15} />
                Xem lời mở đầu
              </button>
            )}
          </div>
          <div className="toolbar-wrap">
            <div className="toolbar" aria-label="Điều khiển không gian ảnh">
              <div className="view-switch">
                <button
                  className="selected"
                  aria-pressed="true"
                  onClick={showScene}
                >
                  <Layers2 />
                  Ảnh trôi
                </button>
                <button onClick={showAlbum} aria-pressed="false">
                  <Images />
                  Album
                </button>
              </div>
              <span className="tool-divider" />
              <button
                className="tool-action"
                onClick={shuffle}
                disabled={items.length < 2 || loading}
              >
                <Shuffle />
                Trộn ảnh
              </button>
              <button
                className="tool-action"
                disabled={!s.floating_enabled}
                aria-pressed={paused}
                onClick={() => setPaused(!paused)}
              >
                {paused ? <Play /> : <Pause />}
                {paused ? "Tiếp tục" : "Tạm dừng"}
              </button>
              <span className="tool-divider" />
              <button className="send-tool" onClick={send}>
                <ImagePlus />
                Gửi kỷ niệm
              </button>
            </div>
          </div>
        </section>
        <section
          ref={album}
          id="album"
          className={`album-section ${mode === "album" ? "full-album" : ""}`}
        >
          <div className="album-inner">
            <div className="album-heading">
              <div>
                <span className="eyebrow">
                  <span className="eyeline" /> ALBUM CỦA LỚP
                </span>
                <h2>
                  Những thước phim <em>thanh xuân</em>
                </h2>
                <p>{s.welcome_message}</p>
              </div>
              {mode === "scene" ? (
                <button className="outline" onClick={showAlbum}>
                  <BookOpen size={16} />
                  Mở album
                </button>
              ) : (
                <button className="outline" onClick={showScene}>
                  <Layers2 size={16} />
                  Về ảnh trôi
                </button>
              )}
            </div>
            {mode === "album" && (
              <div className="album-meta">
                <span>
                  <Aperture size={15} />
                  {demo ? "Bộ ảnh minh họa" : total + " kỷ niệm"}
                </span>
                <button onClick={send}>
                  <ImagePlus size={16} />
                  Gửi kỷ niệm
                </button>
              </div>
            )}
            <div
              className={mode === "album" ? "album-grid" : "album-strip"}
              ref={strip}
            >
              {(mode === "album" ? items : items.slice(0, 8)).map((p) => (
                <button
                  className="album-card"
                  key={p.id}
                  onClick={() => setSelected(p)}
                >
                  <span className="album-pic">
                    <PhotoImage src={p.thumbnail} alt={p.caption} />
                    <i>
                      <Expand size={16} />
                    </i>
                  </span>
                  <span className="album-caption">
                    <span>{p.caption}</span>
                    <small>{p.demo ? "Ảnh minh họa" : p.uploader_name}</small>
                  </span>
                </button>
              ))}
            </div>
            {mode === "scene" ? (
              <div className="strip-controls">
                <button
                  aria-label="Ảnh trước"
                  onClick={() =>
                    strip.current?.scrollBy({ left: -350, behavior: "auto" })
                  }
                >
                  <ChevronLeft size={17} />
                </button>
                <button
                  aria-label="Ảnh tiếp theo"
                  onClick={() =>
                    strip.current?.scrollBy({ left: 350, behavior: "auto" })
                  }
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            ) : (
              photos.length < total && (
                <button
                  className="outline more-button"
                  onClick={more}
                  disabled={loading}
                >
                  <ChevronDown size={16} />
                  {loading ? "Đang tải…" : "Xem thêm ảnh"}
                </button>
              )
            )}
            {demo && (
              <p className="demo-note">
                <Camera size={16} />
                {connection === "offline"
                  ? "Chưa kết nối được kho ảnh."
                  : connection === "ready"
                    ? "Chưa có ảnh được duyệt."
                    : "Kho ảnh đang chờ kết nối."}{" "}
                Album đang hiển thị ảnh minh họa.
              </p>
            )}
          </div>
        </section>
      </main>
      <footer>
        <div>
          <Compass />
          <span>{s.footer_text}</span>
        </div>
        <a href="/admin">
          Quản trị <KeyRound size={13} />
        </a>
      </footer>
      {selected && <Viewer photo={selected} close={() => setSelected(null)} />}{" "}
      {upload && (
        <Upload available={uploadAvailable} close={() => setUpload(false)} />
      )}
      {message && (
        <div className="toast" role="status">
          <Sparkles size={16} />
          {message}
        </div>
      )}
    </>
  );
}
