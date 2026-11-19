"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, ImageOff, Pencil, Search, Trash2, X } from "lucide-react";
import { dateLabel, type Photo, type Status } from "@/lib/model";
import PhotoImage from "../ui/PhotoImage";
import Viewer from "../gallery/Viewer";
import Modal from "../ui/Modal";
const labels = {
  all: "Tất cả",
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Đã từ chối",
};
type Row = Photo & { status: Status };
export default function Moderation({
  photos,
  status,
  search,
  page,
  total,
}: {
  photos: Row[];
  status: Status | "all";
  search: string;
  page: number;
  total: number;
}) {
  const router = useRouter(),
    [chosen, setChosen] = useState<string[]>([]),
    [view, setView] = useState<Row | null>(null),
    [edit, setEdit] = useState<Row | null>(null),
    [remove, setRemove] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const link = (s: string, p = 1) =>
    "/admin?" + new URLSearchParams({ status: s, q: search, page: String(p) });
  async function act(action: string, ids: string[], caption?: string) {
    if (busy || !ids.length) return;
    setBusy(true);
    setNotice("");
    try {
      const r = await fetch("/api/admin/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids, caption }),
      });
      const result = await r.json();
      if (!r.ok) throw Error(result.error);
      setChosen([]);
      setEdit(null);
      setRemove([]);
      setNotice(`Đã cập nhật ${result.count} ảnh.`);
      router.refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Chưa cập nhật được ảnh.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="admin-filters">
        <div className="filter-links">
          {Object.entries(labels).map(([val, label]) => (
            <a
              key={val}
              className={status === val ? "current" : ""}
              href={link(val)}
            >
              {label}
            </a>
          ))}
        </div>
        <form action="/admin" className="search-form">
          <input type="hidden" name="status" value={status} />
          <input
            className="admin-search"
            name="q"
            aria-label="Tìm theo lời nhắn hoặc người gửi"
            placeholder="Lời nhắn, người gửi…"
            maxLength={100}
            defaultValue={search}
          />
          <button aria-label="Tìm ảnh" className="mini-btn">
            <Search size={17} />
          </button>
        </form>
      </div>
      {photos.length > 0 && (
        <div className="bulk">
          <label>
            <input
              type="checkbox"
              checked={chosen.length === photos.length}
              onChange={(e) =>
                setChosen(e.target.checked ? photos.map((p) => p.id) : [])
              }
            />{" "}
            Chọn cả trang
          </label>
          {chosen.length > 0 && (
            <>
              <span>{chosen.length} ảnh</span>
              <button
                className="mini-btn"
                disabled={busy}
                onClick={() => act("approved", chosen)}
              >
                Duyệt
              </button>
              <button
                className="mini-btn"
                disabled={busy}
                onClick={() => act("rejected", chosen)}
              >
                Từ chối
              </button>
              <button
                className="mini-btn"
                disabled={busy}
                onClick={() => setRemove(chosen)}
              >
                Xóa
              </button>
            </>
          )}
        </div>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {!photos.length ? (
        <div className="admin-empty">
          <ImageOff />
          <h2>Chưa có ảnh ở đây</h2>
          <p>Ảnh phù hợp với bộ lọc sẽ xuất hiện tại đây.</p>
        </div>
      ) : (
        <div className="moderation-grid">
          {photos.map((p) => (
            <article className="mod-card" key={p.id}>
              <div className="mod-photo">
                <button
                  onClick={() => setView(p)}
                  aria-label={"Xem ảnh " + p.caption}
                >
                  <PhotoImage src={p.thumbnail} alt={p.caption} />
                </button>
                <label>
                  <input
                    type="checkbox"
                    aria-label={"Chọn ảnh " + p.caption}
                    checked={chosen.includes(p.id)}
                    onChange={(e) =>
                      setChosen((prev) =>
                        e.target.checked
                          ? [...prev, p.id]
                          : prev.filter((id) => id !== p.id),
                      )
                    }
                  />
                </label>
              </div>
              <div className="mod-body">
                <span className={"status " + p.status}>{labels[p.status]}</span>
                <h2>{p.caption}</h2>
                <p>
                  {p.uploader_name} · {dateLabel(p.created_at)}
                </p>
                <div className="mod-actions">
                  <button
                    title="Duyệt ảnh"
                    disabled={busy || p.status === "approved"}
                    onClick={() => act("approved", [p.id])}
                  >
                    <Check size={17} />
                    Duyệt
                  </button>
                  <button
                    title="Từ chối ảnh"
                    disabled={busy || p.status === "rejected"}
                    onClick={() => act("rejected", [p.id])}
                  >
                    <X size={15} />
                    Từ chối
                  </button>
                  <button
                    aria-label="Sửa lời nhắn"
                    disabled={busy}
                    onClick={() => setEdit(p)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    aria-label="Xóa ảnh"
                    disabled={busy}
                    onClick={() => setRemove([p.id])}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="pagination">
        {page > 1 && (
          <a className="outline" href={link(status, page - 1)}>
            Trang trước
          </a>
        )}
        <span>
          Trang {page} · {total} ảnh
        </span>
        {page * 24 < total && (
          <a className="outline" href={link(status, page + 1)}>
            Trang sau
          </a>
        )}
      </div>
      {view && <Viewer photo={view} close={() => setView(null)} />}
      {edit && (
        <Modal title="Sửa lời nhắn" close={() => setEdit(null)}>
          <h2>Sửa lời nhắn</h2>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              act(
                "caption",
                [edit.id],
                String(new FormData(e.currentTarget).get("caption")),
              );
            }}
          >
            <label>
              Lời nhắn
              <textarea
                rows={4}
                name="caption"
                maxLength={1000}
                required
                defaultValue={edit.caption}
              />
            </label>
            {notice && <p role="status">{notice}</p>}
            <button className="primary" disabled={busy}>
              Lưu lời nhắn
            </button>
          </form>
        </Modal>
      )}
      {remove.length > 0 && (
        <Modal title="Xóa kỷ niệm" close={() => setRemove([])}>
          <h2>Xóa {remove.length} kỷ niệm?</h2>
          <p>Ảnh và lời nhắn đã chọn sẽ bị xóa vĩnh viễn.</p>
          {notice && <p role="status">{notice}</p>}
          <div className="confirm-actions">
            <button
              className="outline"
              disabled={busy}
              onClick={() => setRemove([])}
            >
              Giữ lại
            </button>
            <button
              className="primary"
              disabled={busy}
              onClick={() => act("delete", remove)}
            >
              Xóa ảnh
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
