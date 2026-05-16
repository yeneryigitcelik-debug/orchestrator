# Backend Architecture

Sınırları net, değiştirilebilir bir backend yapısı kur. Erken karmaşıklıktan kaçın.

## Ne yap
- Katmanları ayır: transport (route/controller) → servis (iş mantığı) → veri erişimi (repo/ORM).
  İş mantığı HTTP ve DB detayından bağımsız olsun.
- Bağımlılık yönü içe doğru: dış katman içi bilir, iç katman dışı bilmez.
- Bir modül tek sorumluluk taşısın; modüller arası iletişim açık arayüzle (event/interface).
- Ortak kaygıları (auth, log, hata, validation) middleware/dekoratör ile merkezde topla.
- Yapıyı gereksinime göre büyüt: önce modüler monolit, kanıtlanmış ölçek ihtiyacında servis ayır.
- Yan etkileri (mail, webhook, ağır iş) kuyruğa al; request yolunda yapma.
- Sınırı testle: servis katmanı transport ve DB mock'lanmadan test edilebilmeli.

## Kırmızı bayraklar
- İş mantığı route handler'ına gömülü — test edilemez, yeniden kullanılamaz.
- ORM modeli/SQL controller içinde — veri katmanı sızıntısı.
- Kanıtsız "ölçek için" baştan mikroservis — dağıtık monolit acısı.
- Modüller birbirinin iç dosyalarına doğrudan erişiyor (döngüsel bağımlılık).
- Her yere kopyalanmış auth/validation kodu.
