"use client";
import { useRef, useState } from "react";
import { Disc3, Music2, Volume2, SlidersHorizontal } from "lucide-react";
import type { Settings } from "@/lib/model";
export default function Music({ settings }: { settings: Settings }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false),
    [volume, setVolume] = useState(settings.default_volume),
    [open, setOpen] = useState(false),
    [error, setError] = useState("");
  const enabled = settings.music_enabled;
  async function toggle() {
    if (!audio.current || !enabled) return;
    if (!audio.current.paused) {
      audio.current.pause();
      return;
    }
    audio.current.volume = volume / 100;
    try {
      setError("");
      await audio.current.play();
    } catch {
      setError("Chưa phát được nhạc. Hãy thử lại.");
      setOpen(true);
    }
  }
  return (
    <div className="music-wrap">
      <div className="music-pill">
        <button
          onClick={toggle}
          disabled={!enabled}
          aria-pressed={playing}
          aria-label={playing ? "Tắt nhạc" : "Bật nhạc"}
        >
          <Disc3 size={21} className={playing ? "spinning" : ""} />
          <span>
            {!enabled ? "Nhạc đã tắt" : playing ? "Tắt nhạc" : "Bật nhạc"}
          </span>
        </button>
        <button
          className="volume-toggle"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label="Điều chỉnh âm lượng"
        >
          <SlidersHorizontal size={15} />
        </button>
      </div>
      {open && (
        <div className="volume-pop">
          <span>
            <Music2 size={15} />
            {settings.music_path ? "Nhạc của lớp" : "Chiều sân trường"}
          </span>
          <label>
            <Volume2 size={17} />
            <input
              type="range"
              aria-label="Âm lượng"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => {
                const v = +e.target.value;
                setVolume(v);
                if (audio.current) audio.current.volume = v / 100;
              }}
            />
            {volume}%
          </label>
          {error && <p role="alert">{error}</p>}
        </div>
      )}
      {enabled && (
        <audio
          ref={audio}
          preload="none"
          loop
          src={
            settings.music_path
              ? `/api/theme/music?v=${encodeURIComponent(settings.updated_at)}`
              : "/audio/chieu-san-truong.mp3"
          }
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
          onError={() => {
            setError("Chưa tải được bản nhạc.");
            setPlaying(false);
          }}
        />
      )}
    </div>
  );
}
