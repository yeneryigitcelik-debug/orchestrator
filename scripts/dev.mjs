#!/usr/bin/env node
// Geliştirme entry — orchestrator daemon + Next.js dev server.
// Daemon kodu (src/core/*) değişirse tsx hot-reload yapmaz; daemon'ı elle
// yeniden başlat. UI kodu için Next dev HMR çalışmaya devam eder.

import { launch } from "./launch.mjs";

launch("dev");
