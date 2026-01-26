/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    "localhost",
    "localhost:3000",
    "192.168.1.14",
    "192.168.1.14:3000",
  ],
};

module.exports = nextConfig;
