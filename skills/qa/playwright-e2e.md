# Playwright E2E

Playwright ile dayanıklı, flaky olmayan uçtan uca testler.

## Ne yap
- Element'i kullanıcı gibi seç: `getByRole`, `getByLabel`, `getByText` — CSS/XPath son çare.
- Web-first assertion kullan (`await expect(locator).toBeVisible()`) — otomatik bekler, `waitForTimeout` gerekmez.
- Her test izole: kendi verisini kurar, paylaşılan state'e bağımlı değil; `beforeEach` ile temiz başlangıç.
- Kritik kullanıcı akışlarını kapsa: giriş, ana iş akışı, ödeme, hata yolu.
- Test verisi/oturumu için API veya fixture ile setup yap — UI'dan tıklayarak kurma.
- Auth durumunu bir kez kurup `storageState` ile yeniden kullan.
- CI'da `trace`/`screenshot`'ı `on-first-retry` ile aç; hata ayıklanabilir olsun.

## Kırmızı bayraklar
- `page.waitForTimeout(3000)` ile sabit bekleme — flaky'nin ana kaynağı.
- Kırılgan seçici: `div:nth-child(3) > span` — küçük UI değişiminde kopar.
- Testler birbirinin verisine bağlı, sıra önemli.
- Her test UI'dan login oluyor → yavaş ve kırılgan.
- Flaky test `retry`'a güvenip gerçek sorun (race condition) gizleniyor.
