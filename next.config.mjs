/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["192.168.2.166"],
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;