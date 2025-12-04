/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_REFRESH_INTERVAL: process.env.REFRESH_INTERVAL || '300000',
  },
};

export default nextConfig;
