"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera, CheckCircle2, ImagePlus, LoaderCircle, X } from "lucide-react";
import Modal from "../ui/Modal";
import { imageIssue } from "@/lib/validation/photo";
type Entry = { file: File; url: string; id: string; done: boolean };
function send(form: FormData, onProgress: (v: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/submissions");
    xhr.timeout = 90000;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else {
        let reason = "Gửi ảnh chưa thành công. Vui lòng thử lại.";
        try {
          reason = JSON.parse(xhr.responseText).error ?? reason;
        } catch {
          /* Non-JSON provider response. */
        }
        reject(new Error(reason));
      }
    };
    xhr.onerror = xhr.ontimeout = () =>
      reject(new Error("Kết nối bị gián đoạn. Hãy thử gửi lại."));
    xhr.send(form);
  });
}
export default function Upload({
  available,
  close,
}: {
  available: boolean;
  close: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null),
    urls = useRef<string[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [done, setDone] = useState(false),
    [drag, setDrag] = useState(false);
  useEffect(() => {
    const pool = urls.current;
    return () => pool.forEach((u) => URL.revokeObjectURL(u));
  }, []);
  function add(files: FileList | null) {
    if (!files) return;
    setError("");
    const list = Array.from(files);
    if (entries.length + list.length > 6) {
      setError("Bạn có thể chọn tối đa 6 ảnh mỗi lần.");
      return;
    }
    const issue = list.map(imageIssue).find(Boolean);
    if (issue) {
      setError(issue);
      return;
    }
    const added = list.map((file) => {
      const url = URL.createObjectURL(file);
      urls.current.push(url);
      return { file, url, id: crypto.randomUUID(), done: false };
    });
    setEntries((prev) => [...prev, ...added]);
    if (ref.current) ref.current.value = "";
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!available || busy) return;
    if (!entries.length) {
      setError("Hãy chọn ít nhất một bức ảnh.");
      return;
    }
    const fields = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      for (const [i, entry] of entries.entries()) {
        if (entry.done) continue;
        const body = new FormData();
        for (const key of ["uploader_name", "caption", "memory_date"])
          body.set(key, fields.get(key) ?? "");
        body.set("file", entry.file);
        body.set("request_id", entry.id);
        await send(body, (p) =>
          setProgress(Math.floor(((i + p * 0.95) / entries.length) * 100)),
        );
        setEntries((prev) =>
          prev.map((x) => (x.id === entry.id ? { ...x, done: true } : x)),
        );
      }
      setProgress(100);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể gửi ảnh.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Gửi kỷ niệm"
      close={() => {
        if (!busy) close();
      }}
    >
      {done ? (
        <div className="success-box">
          <CheckCircle2 size={42} />
          <h2>Đã gửi kỷ niệm</h2>
          <p>Kỷ niệm của bạn đã được gửi và đang chờ duyệt ❤️</p>
          <button className="primary" onClick={close}>
            Về miền ký ức
          </button>
        </div>
      ) : (
        <>
          <span className="eyebrow">
            <Camera size={15} /> Lưu bút 12A2
          </span>
          <h2>Gửi kỷ niệm</h2>
          <form onSubmit={submit} className="form-stack">
            <input
              ref={ref}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => add(e.target.files)}
            />
            <button
              type="button"
              disabled={busy}
              className={`drop-area ${drag ? "dragging" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                if (!busy) add(e.dataTransfer.files);
              }}
              onClick={() => ref.current?.click()}
            >
              <ImagePlus size={29} />
              <strong>Chọn ảnh hoặc thả ảnh vào đây</strong>
              <small>JPEG, PNG, WebP · Tối đa 4 MB/ảnh · Tối đa 6 ảnh</small>
            </button>
            {entries.length > 0 && (
              <div className="upload-previews">
                {entries.map((v) => (
                  <div key={v.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.url} alt={v.file.name} />
                    {v.done ? (
                      <CheckCircle2 className="sent-check" size={18} />
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        aria-label={"Bỏ ảnh " + v.file.name}
                        onClick={() => {
                          URL.revokeObjectURL(v.url);
                          setEntries((x) => x.filter((a) => a.id !== v.id));
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <label>
              Tên người gửi
              <input
                name="uploader_name"
                placeholder="Tên của bạn"
                required
                maxLength={80}
                disabled={busy}
              />
            </label>
            <label>
              Lời nhắn
              <textarea
                name="caption"
                rows={3}
                required
                maxLength={1000}
                placeholder="Bạn nhớ gì về khoảnh khắc này?"
                disabled={busy}
              />
            </label>
            <label>
              Ngày kỷ niệm <small>(không bắt buộc)</small>
              <input type="date" name="memory_date" disabled={busy} />
            </label>
            {!available && (
              <p className="notice">
                Kho ảnh chưa sẵn sàng nhận kỷ niệm. Bạn có thể chọn ảnh để xem
                trước.
              </p>
            )}
            {error && (
              <p className="error-note" role="alert">
                {error}
              </p>
            )}
            {busy && (
              <div role="status">
                <progress max={100} value={progress} />
                <small> Đang gửi ảnh · {progress}%</small>
              </div>
            )}
            <button className="primary" disabled={busy || !available}>
              {busy ? (
                <LoaderCircle className="spinning" size={18} />
              ) : (
                <ImagePlus size={18} />
              )}
              Gửi kỷ niệm
            </button>
          </form>
        </>
      )}
    </Modal>
  );
}
