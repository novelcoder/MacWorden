import type { NextConfig } from "next";
import path from "node:path";
import { siteRedirects } from "./lib/site-redirects.ts";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: path.resolve(__dirname),
  },
  async redirects() {
    return siteRedirects;
  },
};

export default nextConfig;
