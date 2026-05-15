import type { Metadata } from "next";
import { IBM_Plex_Mono, Orbitron } from "next/font/google";
import "./globals.css";

const plexMono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "displayerall :: orchestrator",
  description: "Lokal Claude Code multi-worker orkestratörü",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className={`${plexMono.variable} ${orbitron.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
