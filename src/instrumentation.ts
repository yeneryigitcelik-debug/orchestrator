// Next.js server boot hook. Bir kez (per process) çalışır.
// Gerçek bootstrap Node runtime'ında src/core/boot.ts'ten dinamik yüklenir —
// böylece process.exit gibi Node-only API'lar Edge bundle'ına sızmaz
// (bu dosyada hiç Node-only API çağrısı yok → Edge derlemesi temiz).

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { bootstrap } = await import("@/core/boot");
  await bootstrap();
}
