import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: path.resolve(__dirname),
  },
  async redirects() {
    return [
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
        source: "/Series.html",
        has: [
          {
            type: "query",
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
  },
};

export default nextConfig;
