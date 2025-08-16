/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'db.qzogmozcxdljgsslsfnh.supabase.co' }, // atau hostname spesifik project kamu
    ],
  },
};

module.exports = nextConfig;
