import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // Permit 127.0.0.1 dev access (otherwise Next 16 blocks cross-origin HMR / hydration scripts).
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
};

export default config;
