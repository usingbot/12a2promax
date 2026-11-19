"use client";
import { useState } from "react";
import { ImageOff } from "lucide-react";
export default function PhotoImage({
  src,
  alt,
  eager = false,
}: {
  src: string;
  alt: string;
  eager?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  return broken ? (
    <span className="missing-image">
      <ImageOff size={25} />
      Ảnh chưa tải được
    </span>
  ) : (
    /* The media endpoints already serve resized WebP and recheck moderation on each read. */
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
      onError={() => setBroken(true)}
    />
  );
}
