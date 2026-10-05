import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
export const metadata: Metadata = {
  title: "Brew Lab — Your coffee notebook",
  description:
    "Record, refine and return to your favourite home coffee recipes.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icons/icon-192.png" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Brew Lab" },
};
export const viewport: Viewport = {
  themeColor: "#faf9f6",
  width: "device-width",
  initialScale: 1,
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
