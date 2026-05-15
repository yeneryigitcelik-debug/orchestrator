# Animation

## Ararsın
- `transition: all` yaygın (perf bilinçsiz)
- `animation-duration` 500ms+ blocking
- Layout property animate (`width`, `top`) — `transform/opacity` olmalı
- `prefers-reduced-motion` honor edilmiyor
- Lottie / Framer Motion otomatik loop her sayfada

## Patterns
- `transition: all 0.5s`
- `animate: { width: 0 }` Framer
- `prefers-reduced-motion: reduce` media query yok

## Severity
- **medium**: a11y problemi (vestibular bozukluk)
- **low**: Perf optimize

## Doğrusu
- Sadece `transform` ve `opacity` animate
- 150-250ms duration sweet spot
- `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none; transition: none; } }`
- Heavy animation throttle

## Örnek
`{"severity":"medium","rule":"reduced-motion-ignored","file":"src/styles.css","line":1,"why":"`prefers-reduced-motion` media query yok — vestibular bozukluğu olan kullanıcılar yön kaybı yaşar","fix":"@media (prefers-reduced-motion: reduce) { *::after { animation-duration: 0.01ms !important; } }","evidence":"/* no reduced-motion handling */"}`
