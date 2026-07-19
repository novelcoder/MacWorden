"use client";

import { useEffect } from "react";

export default function RevealOnScroll() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("on");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    document.querySelectorAll(".reveal, .fade-up").forEach((el) => io.observe(el));

    return () => io.disconnect();
  }, []);

  return null;
}
