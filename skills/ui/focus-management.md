# Focus Management

## Ararsın
- Modal/Dialog açılınca focus içine girmiyor (escape klavye kullanıcısı için)
- Modal kapanınca focus tetik elemente dönmüyor
- `tabindex=-1` veya `outline: none` belirgin alternatif yok
- Custom dropdown'da arrow key navigation yok
- Skip-to-content link yok long header

## Patterns
- Custom modal `<div>` `role="dialog"` ve `aria-modal` yok
- `outline: none` global
- `<button>` yerine `<div onClick>` (keyboard erişimsiz)

## Severity
- **high**: a11y kritik, screen reader / keyboard user kullanamıyor
- **medium**: Focus state belirgin değil
- **low**: Best practice

## Doğrusu
- Radix UI / Headless UI primitives (focus trap dahil)
- `:focus-visible` belirgin ring
- `aria-modal`, `aria-labelledby`, `role`
- Skip link: `<a href="#main">Skip to content</a>`

## Örnek
`{"severity":"high","rule":"modal-no-focus-trap","file":"src/components/Modal.tsx","line":4,"why":"Modal açıldığında focus dışında, tab tuşu modal dışına gider — escape iptal yok","fix":"Radix Dialog veya focus-trap-react ile içeride focus","evidence":"<div className=\"modal\">{children}</div>"}`
