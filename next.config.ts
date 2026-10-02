import type { NextConfig } from "next";

export const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Strict-Transport-Security", value: "max-age=15552000" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=(), payment=(), usb=()" },
  { key: "Content-Security-Policy", value: "object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/signin-with-chatgpt", destination: "/login", permanent: true },
      { source: "/signout-with-chatgpt", destination: "/logout", permanent: true },
      { source: "/downloads/lqadwa-demo.apk", destination: "/downloads/lqadwa-release.apk", permanent: true },
      { source: "/downloads/lqadwa-armv7.apk", destination: "/downloads/lqadwa-release-armv7.apk", permanent: true },
    ];
  },
  async headers() {
    return [{ source: "/api/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] }, { source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
