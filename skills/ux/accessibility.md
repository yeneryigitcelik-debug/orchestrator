# Accessibility (a11y)

## Ararsın
- `<img>` alt yok
- `<button>` yerine `<div onClick>` (keyboard erişilmez)
- Form input `<label>` yok / `aria-label` yok
- Renk kontrast WCAG AA fail (4.5:1)
- Focus state görünmez (`outline: none` ekstra
- aria-live yok dinamik update'lerde
- Keyboard nav (tab order, escape) yok modal'da
- Heading hiyerarşi atlama (h1 → h3)

## Patterns
- `<img src="..." />` (alt eksik)
- `<div onClick={...}>` button rolüsüz
- `outline: none` + alternatif focus yok

## Severity
- **high**: Form unlabel, kontrast fail core sayfa
- **medium**: Alt eksik, focus zayıf
- **low**: Tek tek issue

## Doğrusu
- `<img alt="açıklayıcı">` (dekoratif için `alt=""`)
- `<button type="button">` semantic
- Label htmlFor + input id eşleşmesi
- `:focus-visible` belirgin
- axe / WAVE tarama

## Örnek
`{"severity":"high","rule":"input-no-label","file":"src/pages/login.tsx","line":15,"why":"Email input label yok, sadece placeholder — screen reader \"edit, blank\" diyor","fix":"<label htmlFor=\"email\">E-posta</label><input id=\"email\" name=\"email\" .../>","evidence":"<input type=\"email\" placeholder=\"Email\" />"}`
