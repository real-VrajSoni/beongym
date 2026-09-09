import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Capriola, Geist_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { THEME_COOKIE } from "@/lib/theme";
import { BRAND } from "@/lib/brand";
import "./globals.css";

// Capriola ships a single 400 weight, so hierarchy comes from size, colour and
// letter-spacing rather than from bold. Where markup asks for a heavier weight
// the browser synthesises it, which Capriola's even strokes take cleanly.
const capriola = Capriola({
  variable: "--font-capriola",
  subsets: ["latin"],
  weight: "400",
});

// Identifiers only — gym codes and member codes get read aloud, so 0/O and 1/I
// have to stay distinguishable.
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} — Gym management software`,
    template: `%s · ${BRAND.name}`,
  },
  description:
    "The operating system for gyms: members, attendance, classes, programmes and payments in one place.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0c12" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Theme comes from a cookie so the correct palette is in the first paint.
  // Dark is the product default; only an explicit choice switches to light.
  const theme = (await cookies()).get(THEME_COOKIE)?.value;
  const themeClass = theme === "light" ? "light" : "dark";

  return (
    <html
      lang="en"
      className={`${capriola.variable} ${geistMono.variable} ${themeClass} h-full`}
    >
      <body className="min-h-full antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
