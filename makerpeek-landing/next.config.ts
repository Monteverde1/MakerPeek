import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async redirects() {
    return [{ source: "/privacy.html", destination: "/privacy", permanent: true }];
  },
};

export default nextConfig;
