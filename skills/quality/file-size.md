# File Size / Complexity

## Ararsın
- 800+ satırlık tek dosya (god module)
- 500+ satırlık component (split gerekir)
- Tek bir fonksiyon 200+ satır
- Cyclomatic complexity >15
- Tek dosyada 20+ named export

## Patterns
- `wc -l` 500'den fazla
- React component'te birden fazla unrelated responsibility
- Helper functions 50+ tane tek dosyada

## Severity
- **high**: 1500+ satır core dosya, değişiklik riskli
- **medium**: 500-1000 satır, refactor zamanı
- **low**: 300-500 satır, idare eder

## Doğrusu
- Domain'e göre split: hooks/, components/, services/
- Sub-component extraction
- Custom hook ile state ayrımı

## Örnek
`{"severity":"high","rule":"god-component","file":"src/Dashboard.tsx","line":1,"why":"1842 satır tek bileşen — 14 farklı widget, 23 useState — mental load patladı","fix":"Widget bazlı split: <UsersWidget />, <RevenueWidget />, useDashboardData() hook","evidence":"export default function Dashboard() { ... 1842 satır ... }"}`
