import type { NextConfig } from "next";

const config: NextConfig = {
  // Prisma + worker subprocess'leri server-only kalmalı
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default config;
