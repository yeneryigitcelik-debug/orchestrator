# Hallmark Anti-Slop (UX / akış)

<!-- Kaynak: github.com/Nutlope/hallmark (MIT). Etkileşim/akış "slop" tell'leri. -->

## Ararsın
- Eksik state: interaktif eleman 8 state taşımıyor (default/hover/`:focus-visible`/`:active`/
  disabled/loading/error/success)
- Boş / yükleniyor / hata durumu tasarlanmamış (yalnız happy path)
- Celebratory toast spam — sessiz başarı yerine her aksiyonda toast
- Confirmation dialog, optimistic update + Undo mümkünken
- Hover tooltip 0ms (800ms olmalı); focus tooltip gecikmeli (0ms olmalı)
- Mobilde tıklanabilir metin iki satıra düşüyor (buton/nav/footer/CTA)
- Yatay scroll (`html`/`body` `overflow-x` clip değil)
- Tonsuz, ayırt edici sesi olmayan microcopy ("clean & modern", "get started" yığını)
- `prefers-reduced-motion` desteklenmiyor; fazla/gereksiz motion

## Patterns
- `<button>`/`<a>` için yalnız `:hover` tanımlı, `:focus-visible`/disabled/loading yok
- Liste/tablo render'ı boş-durum ve hata-durumu dallanması olmadan
- Her başarıda `toast.success(...)`; geri-alınamaz aksiyonda Undo yok

## Severity
- **high**: 8 state eksik, mobil yatay scroll, reduced-motion yok, iki-satır tıklanabilir
- **medium**: boş/hata state yok, toast spam, tooltip gecikmesi yanlış
- **low**: microcopy tonsuz, fazla motion

## Doğrusu
- Her interaktif eleman 8 state; boş/yükleniyor/hata bilinçli tasarlanır
- Sessiz başarı > toast; optimistic + Undo > dialog
- Mobil 320/375/414/768 doğrula; reduced-motion ≤150ms crossfade
- Microcopy'ye tone ver (editorial/utilitarian/playful…); jenerik CTA yığını yok
