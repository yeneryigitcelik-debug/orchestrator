# Dead Code

## Ararsın
- Export edilmiş ama nowhere imported fonksiyon/component
- Commented-out kod bloku 10+ satır
- `if (false) { ... }`, `return; ...` sonrası kod
- TODO/FIXME 6+ ay eski git blame ile
- Unused dependency / unused import

## Patterns
- `// TODO` ile başlayan + yıllık eski
- Big commented-out block
- ESLint `no-unreachable` triggered
- `ts-unused-exports` ile çıkan symbol'ler

## Severity
- **medium**: 100+ satır dead code core dosyada
- **low**: Yer yer commented-out
- **info**: TODO eski

## Doğrusu
- Sil — git history zaten saklıyor
- TODO'ya issue number ekle veya çöz
- `ts-unused-exports` script CI'da

## Örnek
`{"severity":"low","rule":"commented-out-block","file":"src/components/Header.tsx","line":42,"why":"54 satırlık commented out JSX bloku — eski tasarım, hala duruyor","fix":"Sil. Eski versiyon git history'de duruyor","evidence":"// <nav>...</nav> (54 satır yorumlu)"}`
