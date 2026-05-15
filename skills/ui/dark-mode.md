# Dark Mode

## Ararsın
- Dark mode yok ama yaygın talep var (modern UI standartı)
- `dark:` Tailwind prefix yok component'lerde
- Hardcoded `bg-white text-black` — dark moda geçmiyor
- Logo / image dark variant yok
- `prefers-color-scheme: dark` media query yok

## Patterns
- `dark:` prefix sınıf hiç yok
- `className=\"bg-white\"` yaygın
- Theme provider / next-themes yok

## Severity
- **medium**: Yok ama eklenmeli (modern UX)
- **low**: Var ama tutarsız (bazı component'ler eksik)
- **info**: İyileştirme

## Doğrusu
- next-themes provider
- Token-based color (bg-background, text-foreground)
- shadcn/ui style approach
- `dark:` prefix tutarlı

## Örnek
`{"severity":"medium","rule":"no-dark-mode","file":"tailwind.config.ts","line":1,"why":"darkMode config yok, `dark:` prefix kullanılmamış — kullanıcı talep ediyor","fix":"darkMode: 'class' + next-themes + bg-background/text-foreground token approach","evidence":"export default { content: [...], theme: {...} } // no darkMode"}`
