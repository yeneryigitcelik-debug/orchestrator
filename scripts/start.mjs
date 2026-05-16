#!/usr/bin/env node
// Production entry — NSSM bu dosyayı `node scripts\start.mjs` ile çağırır.
//
// orchestrator daemon (worker'lar + DB) + Next.js production server'ı birlikte
// ayağa kaldırır. Tüm mantık scripts/launch.mjs'te (dev.mjs ile paylaşılır).
// Önce `pnpm build` çalışmış olmalı (.next gerekir).

import { launch } from "./launch.mjs";

launch("prod");
