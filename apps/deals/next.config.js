/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@my-app/types', '@my-app/database'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'antd'],
  },
};

module.exports = nextConfig;
