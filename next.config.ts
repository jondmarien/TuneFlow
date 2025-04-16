import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['tuneflow.chron0.tech'],
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
