import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The rules engine is pure and the app holds no user data server-side,
  // so everything can be statically rendered and served from the CDN edge.
  // This is what keeps hosting cost at zero.
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
