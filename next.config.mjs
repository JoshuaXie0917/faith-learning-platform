/** @type {import('next').NextConfig} */

// Baseline security headers for every response. No Content-Security-Policy for
// scripts (Next.js inline scripts would need nonces); `frame-ancestors 'none'`
// is the only CSP directive, and it only forbids embedding the site in frames.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig = {
  allowedDevOrigins: ["192.168.2.166"],
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
