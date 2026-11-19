"use client";
import { CalendarDays, UserRound, Camera } from "lucide-react";
import Modal from "../ui/Modal";
import PhotoImage from "../ui/PhotoImage";
import { dateLabel, type Photo } from "@/lib/model";
export default function Viewer({
  photo,
  close,
}: {
  photo: Photo;
  close: () => void;
}) {
  return (
    <Modal title="Chi tiết kỷ niệm" close={close} wide>
      <div className="viewer-image">
        <PhotoImage key={photo.id} src={photo.src} alt={photo.caption} eager />
      </div>
      <div className="viewer-copy">
        {photo.demo && (
          <span className="eyebrow">
            <Camera size={14} /> Ảnh minh họa
          </span>
        )}
        <h2>{photo.caption}</h2>
        <div className="metadata">
          <span>
            <UserRound />
            {photo.uploader_name}
          </span>
          {photo.created_at && (
            <span>
              <CalendarDays />
              Gửi ngày {dateLabel(photo.created_at)}
            </span>
          )}
        </div>
        {photo.memory_date && (
          <p>Ngày kỷ niệm · {dateLabel(photo.memory_date)}</p>
        )}
      </div>
    </Modal>
  );
}
