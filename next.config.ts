import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['tuneflow.chron0.tech'],
  output: 'export',
  /* config options here */
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
