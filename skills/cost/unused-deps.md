# Unused Dependencies

## Ararsın
- `package.json` dep var ama hiç import edilmiyor
- Duplicate işlev (axios + ky + fetch wrapper)
- Eski library yerine modern alternatif (moment → dayjs, lodash → native)
- Heavy dep'in light alternatif var (react-icons → lucide-react)
- DevDep'ler prod dep'e karışmış

## Patterns
- `depcheck` çıktısı
- `package.json` her dep import edilmiş mi?

## Severity
- **medium**: 30MB+ unused dep, bundle ve install süresine etki
- **low**: Tek tük unused
- **info**: Alternatif önerisi

## Doğrusu
- `depcheck` CI'da
- `pnpm remove <unused>`
- Native API yeterse 3rd party silinir
- DevDep ↔ Dep ayrımı net

## Örnek
`{"severity":"medium","rule":"unused-lodash","file":"package.json","line":15,"why":"lodash dep var ama kullanım sadece `_.debounce` — projeye 280KB","fix":"`pnpm remove lodash` veya `lodash-es/debounce` tek fonksiyon","evidence":"\"lodash\": \"^4.17.21\""}`
