import type { Metadata } from "next";
import { IBM_Plex_Mono, VT323 } from "next/font/google";
import "./globals.css";

const plexMono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

const vt323 = VT323({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "displayerall :: builder",
  description: "Lokal Claude Code multi-agent build orkestratörü",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className={`${plexMono.variable} ${vt323.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
