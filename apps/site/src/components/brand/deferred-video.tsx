"use client";

import { useEffect, useRef } from "react";
import { useInView, useReducedMotion } from "framer-motion";

// Autoplay overrides preload="none". Withhold the source until the video is
// near the viewport, and keep the existing background as the static fallback.
export function DeferredVideo({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const visible = useInView(ref, { once: true, margin: "300px" });
  const reduce = useReducedMotion();
  const active = visible && reduce === false;
  useEffect(() => {
    if (active) void ref.current?.play().catch(() => {});
    else {
      ref.current?.pause();
      ref.current?.load();
    }
  }, [active]);
  return (
    <video
      ref={ref}
      aria-hidden
      src={active ? src : undefined}
      autoPlay={active}
      muted
      loop
      playsInline
      preload="none"
      className={className}
    />
  );
}
