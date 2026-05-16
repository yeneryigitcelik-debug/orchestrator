# Cognitive Complexity

## Ararsın
- Tek fonksiyon nesting >4 seviye (`if/for/if/switch/if`)
- Cyclomatic complexity >15 (eslint-plugin-sonarjs)
- Switch case 20+ branch, polymorphism alternatif
- Boolean trap: 5+ boolean param (caller tarafı okunmaz)

## Patterns
- `function() {` 100+ satır, deep indent
- Çoklu return point + side effect
- if/else chain genişliyor

## Severity
- **medium**: 200+ satır core fonksiyon, refactor şart
- **low**: 50-100 satır, izole

## Doğrusu
- Erken return (guard clause)
- Strategy pattern (object lookup)
- Helper function extract
- Replace boolean params with enum/object

## Örnek
`{"severity":"medium","rule":"deep-nesting","file":"src/services/billing.ts","line":42,"why":"Faturalandırma 6 seviye nested if/for — okuma + test imkansız","fix":"Guard clause + strategy obj (rateTable lookup) + extract helper","evidence":"if (user.country === 'TR') { if (user.plan === 'pro') { for (...) { if (...) { ... } } } }"}`
