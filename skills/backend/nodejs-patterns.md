# Node.js Patterns

Üretim kalitesinde Node.js backend kodu — async, kaynak ve süreç hijyeni.

## Ne yap
- Her async işi `await`le; floating promise bırakma. Bağımsız işleri `Promise.all` ile paralel sür.
- Ağır CPU işini event loop'tan ayır (worker thread, kuyruk) — request handler'ı bloklama.
- Bağlantı havuzu (DB, HTTP client) uygulama ömrü boyunca tek; her istekte yeni client açma.
- Yapılandırmayı env'den oku, başlangıçta doğrula (eksik env ile boot'ta patla, runtime'da değil).
- Graceful shutdown: `SIGTERM`'de yeni isteği reddet, mevcutları bitir, havuzu kapat.
- Stream'le büyük veri; tüm dosyayı/response'u belleğe alma.
- Yapılandırılmış log (JSON), istek başına correlation id.

## Kırmızı bayraklar
- `async` fonksiyonun dönüşü `await`siz/`catch`siz bırakılmış (unhandled rejection).
- Senkron blok (`fs.readFileSync`, ağır JSON.parse) request yolunda.
- Her istekte yeni DB bağlantısı / yeni HTTP agent.
- `process.env` runtime'da serpiştirilmiş, tek noktada doğrulanmamış.
- Hata yutuluyor (`catch {}`) veya tüm süreç `uncaughtException`'da yaşamaya devam ediyor.
