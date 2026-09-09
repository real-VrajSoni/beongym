import type { NextConfig } from "next";

/** Everything behind a sign-in. Nothing here may sit in a browser cache. */
const PRIVATE_ROUTES = ["/gym/:path*", "/admin/:path*", "/me/:path*", "/start/:path*", "/checkin/:path*"];

const nextConfig: NextConfig = {
  // The floating dev badge overlaps the sidebar's account menu in this layout,
  // so it is switched off. It never appears in production builds anyway.
  devIndicators: false,

  /**
   * `no-store` on every signed-in page.
   *
   * Without it the browser keeps the rendered page in its back/forward cache,
   * so pressing Back after signing out puts somebody's dashboard back on screen
   * — their members, their revenue — on what is often a shared front-desk
   * machine. `no-cache` is not enough: only `no-store` keeps a page out of
   * bfcache, which restores pages without asking the server at all.
   *
   * Set here rather than in the proxy because Next rewrites the header on
   * responses that pass through `NextResponse.next()`.
   */
  async headers() {
    return PRIVATE_ROUTES.map((source) => ({
      source,
      headers: [
        { key: "Cache-Control", value: "no-store, must-revalidate" },
        { key: "Pragma", value: "no-cache" },
      ],
    }));
  },
};

export default nextConfig;
