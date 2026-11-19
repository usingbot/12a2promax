"use client";
import type { CSSProperties } from "react";
import type { Photo } from "@/lib/model";
import PhotoImage from "../ui/PhotoImage";
export type Slot = { x: number; y: number; angle: number; width: number };
export const welcomeSlots: Slot[] = [
  { x: 17, y: 33, angle: -12, width: 18 },
  { x: 84, y: 29, angle: 10, width: 17.5 },
  { x: 18.5, y: 73, angle: 8, width: 16.5 },
  { x: 83.4, y: 72, angle: -10, width: 18 },
];
export function sceneSlots(count: number, mobile = false): Slot[] {
  const rows = mobile && count > 2 ? 2 : count > 6 ? 3 : count > 3 ? 2 : 1;
  return Array.from({ length: count }, (_, i) => {
    const cols = Math.ceil(count / rows),
      row = Math.floor(i / cols),
      rowCount = Math.min(cols, count - row * cols);
    return {
      x: (100 * ((i % cols) + 0.5)) / rowCount,
      y: (100 * (row + 0.5)) / rows + (i % 2 ? 2 : -2),
      angle: [-7, 5, -3, 7][i % 4],
      width: Math.min(21, 72 / cols, rows === 3 ? 12 : 20),
    };
  });
}
export default function Polaroid({
  photo,
  slot,
  index,
  open,
}: {
  photo: Photo;
  slot: Slot;
  index: number;
  open: () => void;
}) {
  const style = {
    "--x": slot.x + "%",
    "--y": slot.y + "%",
    "--w": slot.width + "%",
    "--angle": slot.angle + "deg",
    "--delay": -index * 3.7 + "s",
    "--time": 13 + (index % 5) * 1.5 + "s",
    "--dir": index % 2 ? -1 : 1,
  } as CSSProperties;
  return (
    <div
      className={`photo-slot slot-${index} ${index > 3 ? "extra-slot" : ""}`}
      style={style}
    >
      <div className="drift">
        <button
          className={`polaroid frame-${index % 4}`}
          onClick={open}
          aria-label={"Mở ảnh " + photo.caption}
        >
          <i className="fastener" aria-hidden="true" />
          <span className="polaroid-image">
            <PhotoImage
              key={photo.thumbnail}
              src={photo.thumbnail}
              alt={photo.caption}
              eager={index < 4}
            />
          </span>
          <span className="hand-caption">
            {photo.caption}
            <span aria-hidden="true">{["♡", "✧", "☼", "♡"][index % 4]}</span>
          </span>
        </button>
      </div>
    </div>
  );
}
