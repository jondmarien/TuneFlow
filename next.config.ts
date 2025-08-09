import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['tuneflow.chron0.tech'],
  // Remove 'output: export' for development to enable API routes
  // output: 'export', // Uncomment for static export builds
  /* config options here */
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
