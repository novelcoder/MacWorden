"use client";

import { useState } from "react";

export default function BookCoverImage({
  src,
  fallbackSrc,
  alt,
}: {
  src: string;
  fallbackSrc: string;
  alt: string;
}) {
  const [errored, setErrored] = useState(false);
  return <img src={errored ? fallbackSrc : src} alt={alt} onError={() => setErrored(true)} />;
}
