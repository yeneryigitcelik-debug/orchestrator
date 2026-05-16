# Bundle Size

## Ararsın
- Büyük kütüphanenin tamamı import edilmiş (moment, lodash, chart.js)
- `import * as X from 'big-lib'` (tree-shake olmuyor)
- Client component'te server-only paket import (sharp, pdf-lib)
- Dynamic import gerekli (modal, editor, chart) ama yok
- Aynı işi yapan 2 kütüphane (axios + fetch wrapper, moment + dayjs)

## Patterns
- `import _ from 'lodash'` (tüm lodash bundle'a girer)
- `'use client'` dosyada `sharp`, `mongoose`, `fs` import
- Route-level component synchronous import (chart, monaco, etc.)

## Severity
- **high**: 200KB+ tek dep, initial bundle 1MB+
- **medium**: Tree-shake ile 50KB tasarruf, lazy load fırsatı
- **low**: Best-practice naming

## Doğrusu
- `import { debounce } from 'lodash-es'`
- `dayjs` (5KB) > `moment` (300KB)
- `next/dynamic` lazy load
- Bundle analyzer (next/bundle-analyzer, vite-plugin-visualizer)

## Örnek
`{"severity":"high","rule":"full-lodash-import","file":"src/utils.ts","line":1,"why":"`import _ from 'lodash'` tüm 280KB bundle'a giriyor — sadece debounce kullanılıyor","fix":"`import debounce from 'lodash-es/debounce'`","evidence":"import _ from 'lodash'; export const fn = _.debounce(...)"}`
