# Icon System

## Ararsın
- 3 farklı icon set karışık (lucide + heroicons + custom svg)
- Icon font (icomoon) + SVG karışımı, bazıları render zayıf
- Inline SVG her component'te kopyalanmış
- `<img src="icon.png">` icon (retina/dark mode broken)
- Icon size standartlaşmamış (`w-4`, `w-5`, `w-6` keyfi)

## Patterns
- `import { Search } from 'lucide-react'` + `<svg>...</svg>` inline aynı projede
- Random heroicons / phosphor / radix mix

## Severity
- **medium**: Visual inconsistency
- **low**: Best practice
- **info**: Refactor

## Doğrusu
- Tek icon library (lucide-react önerilir — tree-shake friendly)
- Sized scale: xs(12)/sm(16)/md(20)/lg(24)
- Custom icon'lar `<Icon name="..." />` wrapper

## Örnek
`{"severity":"medium","rule":"mixed-icon-libs","file":"src/components/Sidebar.tsx","line":2,"why":"Sidebar lucide-react + heroicons + custom svg karışık — bundle 80KB ekstra + tutarsız stroke width","fix":"Tek lucide-react'e geç, design system karar","evidence":"import { Search } from 'lucide-react';\nimport { CogIcon } from '@heroicons/react/24/outline';"}`
