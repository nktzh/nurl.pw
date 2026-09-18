import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  poweredByHeader: false,
};

export default nextConfig;
