"use client";

import { useEffect, useRef } from "react";

const FLAKE_COUNT = 60;

export default function SnowOverlay() {
  const snowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const snow = snowRef.current;
    if (!snow || snow.childElementCount > 0) return;

    for (let i = 0; i < FLAKE_COUNT; i++) {
      const flake = document.createElement("div");
      flake.className = "flake";
      const size = 1 + Math.random() * 3;
      flake.style.width = flake.style.height = `${size}px`;
      flake.style.left = `${Math.random() * 100}vw`;
      flake.style.opacity = String(0.3 + Math.random() * 0.5);
      flake.style.animationDuration = `${8 + Math.random() * 14}s`;
      flake.style.animationDelay = `${-Math.random() * 18}s`;
      flake.style.filter = `blur(${Math.random() * 1.2}px)`;
      snow.appendChild(flake);
    }
  }, []);

  return <div className="snow" id="snow" ref={snowRef} />;
}
