# Component Kütüphanesi Kurma

Token'lar foundation; component kütüphanesi onların üstündeki ilk kattır. Amaç: ürün
ekranlarını kuran helper'lar (frontend/mobile/ios/android) sıfırdan buton yazmasın —
tutarlı, erişilebilir, token-bağlı bir set hazır olsun.

## Component API kontratı
- **Varyant + boy prop'u**, boolean bayrak çorbası değil:
  `<Button variant="primary|secondary|ghost|destructive" size="sm|md|lg">`.
  `isPrimary isLarge isGhost` ❌ → kombinasyonlar patlar, tutarsızlaşır.
- Web'de varyantları `cva` (class-variance-authority) ile yönet — token class'larına map'le.
- **Compound component** karmaşık parçalar için: `<Card><Card.Header/><Card.Body/></Card>`.
- `className`/`style` override kapısı bırak ama varyantı ezme; `asChild` deseni faydalı.
- Kontrollü/kontrolsüz ikisini de destekle (`value` + `defaultValue`).
- Token oku — component içinde hex/px yok.

## Foundation set (önce bunlar)
- **Primitive**: Button, IconButton, Input, Textarea, Select, Checkbox, Radio,
  Switch, Slider, Label, Badge, Avatar, Spinner, Tooltip
- **Layout**: Box/Stack/Grid, Card, Divider, Container
- **Overlay**: Dialog/Modal, Drawer/Sheet, Popover, Toast, Dropdown Menu
- **Navigation**: Tabs, Breadcrumb, Pagination, Nav/Sidebar item
- **Data**: Table, List item, Empty state, Skeleton
- **Feedback**: Alert, Progress, inline form error

Bunları kur; ürüne özel bileşik component'ler bunlardan türesin.

## Erişilebilirlik (component'e gömülü)
- Davranış için headless temel kullan (Radix UI / React Aria) — odak tuzağı,
  klavye, ARIA bedavaya gelir; sen token ile giydir.
- Her interaktif element: klavyeyle ulaşılır, görünür focus halkası, doğru rol.
- Dialog: focus trap + Esc + scroll lock + `aria-modal`.
- Form alanı: `label` bağlı, hata `aria-describedby` ile, `aria-invalid`.
- İkon-only buton: `aria-label`.

## Durum eksiksizliği
Her component için tanımla: default, hover, focus-visible, active/pressed, disabled,
loading, error; veri component'lerinde ayrıca empty + skeleton. Eksik durum = ürün
helper'ı uydurur = tutarsızlık.

## Dokümantasyon
- Storybook (web) — her component, her varyant/durum bir story.
- `DESIGN-SYSTEM.md` — component listesi, prop API'leri, ne zaman hangisi.
- Kullanım örneği ver; ürün helper'ı kopyalayıp uyarlasın.

## Ne yap
- Headless davranış kütüphanesi + token-temelli stil katmanını ayır.
- Foundation set'i bitir, sonra ürüne özel bileşik component.
- Her component'i her durumuyla + Storybook story'siyle teslim et.
- Tek `Button`, tek `Input` — duplikasyona izin verme.

## Kırmızı bayraklar
- Boolean prop çorbası (`isPrimary isSmall isLoading isGhost`).
- A11y'yi "sonra" diye atlamak — focus/klavye/ARIA yok.
- Component içinde hardcode renk/spacing — token atlanmış.
- loading/empty/error durumları tanımsız.
- Aynı amaca üç farklı component (Button × 3).
- Storybook/doküman yok → ürün helper'ı API'yi tahmin ediyor.
