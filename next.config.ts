import type { NextConfig } from "next";
 
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // ...keep any other settings you already have
};
 
export default nextConfig;