// Cross-platform path yardımcıları — SAF (DB / yan etki yok). Hem daemon (src/core)
// hem de Next (src/app, src/components) güvenle import edebilir.

import { resolve as resolvePath } from "node:path";

/**
 * İki cwd'yi KARŞILAŞTIRMAK / anahtarlamak için normalize eder.
 * Windows case-insensitive + slash karışıklığı yaygın → lowercase + forward-slash.
 *
 * DİKKAT: Bu, dosya sistemi işlemleri için kullanılacak GERÇEK yol değildir
 * (case-sensitive FS'te lowercase yolu bozar). Yalnız eşitlik testi / mutex
 * anahtarı için kullan. Gerçek FS yolu için `path.resolve(cwd)` kullan.
 */
export function normalizeCwd(p: string): string {
  return resolvePath(p).replace(/\\/g, "/").toLowerCase();
}
