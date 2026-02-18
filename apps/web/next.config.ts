import { resolve } from 'path';
import type { NextConfig } from 'next';

if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_API_URL) {
  throw new Error(
    'NEXT_PUBLIC_API_URL must be set for production builds — ' +
      'without it the API URL is baked in as http://localhost:3001'
  );
}

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  poweredByHeader: false,
  turbopack: {
    root: resolve(__dirname, '../..'),
  },
};

export default nextConfig;
