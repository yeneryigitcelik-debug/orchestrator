# Deployment Strategy

Sürümü kullanıcıyı riske atmadan yayına al; geri dönüş her zaman hazır olsun.

## Ne yap
- Kademeli yayım: blue-green veya canary — yeni sürümü trafiğin küçük dilimine aç, metrik izle, sonra genişlet.
- Her deploy'da anında rollback yolu olsun (önceki sürüm/imaj hazır, tek komutla dön).
- Sağlık kontrolü (healthcheck/readiness) tanımla; trafiği ancak yeni sürüm "hazır" deyince al.
- DB migration'ı geriye-uyumlu yap: önce şemayı genişlet, kodu deploy et, sonra eski kolonu kaldır
  (expand/contract) — kod ve şema asla aynı anda kırılmasın.
- Yapılandırmayı imajdan ayır; aynı artefakt staging ve prod'da koşsun.
- Deploy'u otomatikleştir ve tekrar üretilebilir kıl; "elle sunucuya gir" adımı bırakma.
- Yayım sonrası hata oranı/gecikme izle; eşik aşılınca otomatik veya hızlı manuel rollback.

## Kırmızı bayraklar
- Big-bang deploy — tüm trafik tek anda yeni sürüme, gözlem yok.
- Rollback planı yok; sorun çıkınca tek çare ileri düzeltme (panik).
- Migration kodla aynı anda kırıcı — deploy yarıda kalırsa veri/uygulama tutarsız.
- Healthcheck yok → hazır olmayan instance'a trafik gidiyor.
- Deploy elle, adımlar kişinin aklında — tekrar üretilemez.
