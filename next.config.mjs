/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  output: 'export',
  trailingSlash: true,
  distDir: process.env.DIST_DIR || undefined,
  basePath,
  images: { unoptimized: true },
};

export default nextConfig;
