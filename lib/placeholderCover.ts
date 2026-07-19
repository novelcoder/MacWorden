function safe(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Placeholder cover generator — used for any book without a real cover URL yet.
export function placeholderCover(title: string, subtitle?: string): string {
  const lines = title.toUpperCase().split(/\s+/);
  const txtLines = lines
    .map(
      (w, i) =>
        `<text x="200" y="${260 + i * 56}" text-anchor="middle" fill="#EDE3D2" font-family="Big Shoulders Stencil Display, Impact, sans-serif" font-weight="700" font-size="52" letter-spacing="2">${safe(w)}</text>`
    )
    .join("");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="#131A24"/><stop offset="100%" stop-color="#0A0E14"/>` +
    `</linearGradient></defs>` +
    `<rect width="400" height="600" fill="url(#g)"/>` +
    `<rect x="24" y="24" width="352" height="552" fill="none" stroke="#D9A55F" stroke-opacity="0.25" stroke-width="1"/>` +
    `<text x="200" y="110" text-anchor="middle" fill="#D9A55F" font-family="Barlow Condensed, sans-serif" font-weight="500" font-size="18" letter-spacing="6">MAC WORDEN</text>` +
    `<line x1="140" y1="140" x2="260" y2="140" stroke="#D9A55F" stroke-width="1"/>` +
    txtLines +
    `<text x="200" y="520" text-anchor="middle" fill="#C9BFAD" font-family="Cormorant Garamond, serif" font-style="italic" font-size="20">${safe(subtitle ?? "")}</text>` +
    `</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
