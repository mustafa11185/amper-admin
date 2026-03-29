import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["amper-admin.onrender.com", "localhost:3000"],
    },
  },
};

export default nextConfig;
