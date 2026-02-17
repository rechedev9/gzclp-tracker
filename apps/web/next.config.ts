import { resolve } from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  poweredByHeader: false,
  turbopack: {
    root: resolve(__dirname, '../..'),
  },
};

export default nextConfig;
