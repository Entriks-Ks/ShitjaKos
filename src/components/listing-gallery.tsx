"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./listing-gallery.module.css";

type Photo = { id: string; altText: string };

export function ListingGallery({
  media,
  overlay,
}: {
  media: Photo[];
  overlay?: ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const thumbs = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);
  const current = media[index];

  useEffect(() => {
    const root = thumbs.current;
    const selected = root?.querySelector<HTMLElement>("[data-active='true']");
    if (!root || !selected) return;
    root.scrollTo({
      left: selected.offsetLeft - (root.clientWidth - selected.offsetWidth) / 2,
      behavior: "smooth",
    });
  }, [index]);

  if (!media.length) {
    return (
      <div className={styles.stage}>
        <div className={styles.empty}>No photos yet</div>
        {overlay}
      </div>
    );
  }

  function go(delta: number) {
    setIndex((value) => (value + delta + media.length) % media.length);
  }

  return (
    <div className={styles.gallery}>
      <div
        className={styles.stage}
        onTouchStart={(event) => {
          startX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const start = startX.current;
          startX.current = null;
          if (start == null || media.length < 2) return;
          const end = event.changedTouches[0]?.clientX ?? start;
          const move = end - start;
          if (move > 40) go(-1);
          if (move < -40) go(1);
        }}
      >
        <Image
          key={current.id}
          priority={index === 0}
          unoptimized
          fill
          sizes="(max-width: 1024px) 100vw, 60vw"
          className={styles.photo}
          src={`/api/media/${current.id}`}
          alt={current.altText}
        />
        {media.length > 1 && (
          <>
            <button
              type="button"
              className={`${styles.arrow} ${styles.prev}`}
              aria-label="Previous photo"
              onClick={() => go(-1)}
            >
              <ChevronLeft size={20} strokeWidth={2.2} />
            </button>
            <button
              type="button"
              className={`${styles.arrow} ${styles.next}`}
              aria-label="Next photo"
              onClick={() => go(1)}
            >
              <ChevronRight size={20} strokeWidth={2.2} />
            </button>
          </>
        )}
        {overlay}
      </div>
      {media.length > 1 && (
        <div className={styles.thumbs} ref={thumbs}>
          {media.map((photo, photoIndex) => (
            <button
              key={photo.id}
              type="button"
              data-active={photoIndex === index}
              className={styles.thumb}
              aria-label={`Show photo ${photoIndex + 1}`}
              aria-current={photoIndex === index}
              onClick={() => setIndex(photoIndex)}
            >
              <Image
                unoptimized
                fill
                sizes="88px"
                className={styles.thumbPhoto}
                src={`/api/media/${photo.id}?size=thumb`}
                alt=""
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
