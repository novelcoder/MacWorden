export const siteRedirects = [
  {
    source: "/index.html",
    destination: "/",
    permanent: true,
  },
  {
    source: "/privacy.html",
    destination: "/privacy",
    permanent: true,
  },
  {
    source: "/JackAndCoke",
    destination: "/JackAndCocoa",
    permanent: true,
  },
  {
    source: "/Series.html",
    has: [
      {
        type: "query" as const,
        key: "series",
        value: "(?<series>.+)",
      },
    ],
    destination: "/series/:series",
    permanent: true,
  },
  {
    source: "/Series.html",
    destination: "/series",
    permanent: true,
  },
];
