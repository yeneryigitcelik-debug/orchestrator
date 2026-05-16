# Error / Empty / Loading States

## Ararsın
- Loading: app açılınca beyaz boş ekran (skeleton/spinner yok)
- Error: query fail'inde sadece "error" yazıyor, retry yok
- Empty: liste boşsa hiç bir şey görünmüyor (boş state yok)
- 404: özel sayfa yok, default browser error
- Offline: fetch fail'de generic mesaj
- Error boundary yok — bir component patladığında tüm app çöküyor

## Patterns
- `{data && data.map(...)}` ama loading/error/empty ayrı handling yok
- React Error Boundary yok
- `try/catch` sonrası generic toast

## Severity
- **high**: Top-level error boundary yok, tek hata tüm app çöküyor
- **medium**: Empty/error state yok feature sayfalarda
- **low**: Loading skeleton yok

## Doğrusu
- 4 state: idle / loading / error / success / empty
- React Query / SWR pattern
- `<ErrorBoundary fallback={<ErrorPage />}>`
- Empty state'de primary CTA (ilk eylem)
- Retry button her error state'te

## Örnek
`{"severity":"high","rule":"no-error-boundary","file":"src/App.tsx","line":1,"why":"Root'ta ErrorBoundary yok — bir component throw etse beyaz ekran","fix":"<ErrorBoundary fallback={<ErrorPage onRetry={reset} />}><App /></ErrorBoundary>","evidence":"ReactDOM.createRoot(el).render(<App />)"}`
