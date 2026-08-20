/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@my-app/types', '@my-app/database'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'antd'],
    allowedDevOrigins: ['192.168.15.36:3000', 'localhost:3000'],
  },
};

module.exports = nextConfig;
