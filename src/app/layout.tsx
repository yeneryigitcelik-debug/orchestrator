import type { Metadata } from "next";
import { IBM_Plex_Mono, Orbitron } from "next/font/google";
import "./globals.css";
import { MatrixRain } from "@/components/MatrixRain";

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
  title: "ORCHESTRATOR :: claude multi-agent",
  description: "Yerel Claude Code çok-ajanlı orkestratör paneli",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className={`${plexMono.variable} ${orbitron.variable}`}>
      <body className="antialiased">
        <MatrixRain />
        {children}
        <div className="crt-overlay" aria-hidden="true" />
      </body>
    </html>
  );
}
