# Mobile Touch Targets

## Ararsın
- Touch target <44×44px (Apple HIG / WCAG önerisi)
- Yan yana iki tıklanabilir element <8px aralık
- Hover-only interaction mobilde erişilemez (dropdown menü hover'a bağlı)
- iOS double-tap zoom bozulmuş `<meta viewport>` yanlış
- Pull-to-refresh çalışmıyor (overflow scroll container)

## Patterns
- `<button className="text-xs px-1">×</button>` küçük close button
- `:hover` dependent menu
- `viewport` user-scalable=no

## Severity
- **high**: Ana CTA butonu mobile'da zor tıklanıyor
- **medium**: Yan yana element'ler yanlış tıklama
- **low**: Polish

## Doğrusu
- Min 44×44 touch target, 8px gap
- Tap state (`:active`) hover yerine
- `<meta name="viewport" content="width=device-width, initial-scale=1">` user-scalable kalmalı
- iOS Safari `-webkit-tap-highlight-color` yönetimi

## Örnek
`{"severity":"high","rule":"small-touch-target","file":"src/components/Toast.tsx","line":12,"why":"Toast close butonu 18×18px — mobile'da mis-tap, kullanıcı kapatamıyor","fix":"min 44×44px, padding ile genişlet (hit area)","evidence":"<button className=\"w-4 h-4 text-xs\">×</button>"}`
