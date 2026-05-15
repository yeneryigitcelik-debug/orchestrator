# Design Tokens

## Ararsın
- Hex renk hardcoded `#3b82f6` 50+ yerde (token yerine)
- Magic number padding/margin: `padding: '14px'`, `margin: '7px'`
- font-size'lar inline: `text-[13px]`
- Color/spacing/radius scale yok (tailwind config / theme)

## Patterns
- `#[0-9a-f]{6}` literal — design token yok
- `style={{ padding: 14 }}` magic number
- tailwind.config'de `theme.extend.colors` yok ama brand renkler yaygın

## Severity
- **high**: Rebrand imkânsız (50+ yer hex), dark mode break
- **medium**: Magic number çok ama tek tek manageable
- **low**: Inline style yer yer

## Doğrusu
- Theme/tokens: `colors.brand.500`, `spacing.4`
- Tailwind config'de extend
- CSS variable (var(--color-brand))
- Storybook/design tokens üretici

## Örnek
`{"severity":"medium","rule":"hardcoded-brand-color","file":"src/components/Button.tsx","line":8,"why":"`bg-[#3b82f6]` literal 28 component'te kullanılmış — brand değişiminde 28 yer düzenlenmeli","fix":"tailwind.config.ts theme.extend.colors.brand.500 = '#3b82f6'; sonra bg-brand-500","evidence":"<button className=\"bg-[#3b82f6] text-white\">"}`
