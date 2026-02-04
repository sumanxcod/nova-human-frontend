/** @type {import('next').NextConfig} */
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig = {
  turbopack: {}, // just to silence the warning
  allowedDevOrigins: [
    "localhost",
    "localhost:3000",
    "192.168.1.14",
    "192.168.1.14:3000",
  ],
};

module.exports = withPWA(nextConfig);
