import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Cloudflare Workers cannot load native addons; WASM packages must be
  // externalized so wrangler bundles their wasm unbundled.
  serverExternalPackages: ['@cf-wasm/photon', '@cf-wasm/resvg', '@jsquash/webp'],
  images: { unoptimized: true },
  experimental: {
    serverActions: { bodySizeLimit: '8mb' },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

export default nextConfig;
