import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

const allowedTags = [
  ...sanitizeHtml.defaults.allowedTags,
  "img",
  "figure",
  "figcaption",
  "iframe",
];

function absoluteUrl(value: string, baseUrl?: string) {
  if (!baseUrl || !value.startsWith("/")) return value;
  return new URL(value, baseUrl).toString();
}

export async function renderMarkdown(markdown: string, baseUrl?: string) {
  const rendered = await marked.parse(markdown, {
    gfm: true,
    breaks: false,
  });

  return sanitizeHtml(rendered, {
    allowedTags,
    allowedAttributes: {
      a: ["href", "name", "target", "rel", "title"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      iframe: [
        "src",
        "title",
        "width",
        "height",
        "allow",
        "allowfullscreen",
        "loading",
      ],
      blockquote: ["cite"],
      code: ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      img: ["http", "https"],
      iframe: ["http", "https"],
    },
    allowedIframeHostnames: [
      "www.youtube.com",
      "youtube.com",
      "www.youtube-nocookie.com",
      "player.vimeo.com",
    ],
    transformTags: {
      a(tagName, attribs) {
        const href = attribs.href ? absoluteUrl(attribs.href, baseUrl) : "";
        const external = href.startsWith("http");
        return {
          tagName,
          attribs: {
            ...attribs,
            href,
            ...(external ? { rel: "noopener noreferrer" } : {}),
          },
        };
      },
      img(tagName, attribs) {
        return {
          tagName,
          attribs: {
            ...attribs,
            src: absoluteUrl(attribs.src || "", baseUrl),
            loading: "lazy",
          },
        };
      },
    },
  });
}
