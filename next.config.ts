import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  productionBrowserSourceMaps: false,
};

export default nextConfig;
