<!-- Imported from vibecosystem/skills/component-library-patterns (MIT) — https://github.com/vibeeval/vibecosystem -->

# Component Library Patterns

## Design Tokens

```typescript
// tokens.ts - Single source of truth
export const tokens = {
  color: {
    primary: { 50: '#eff6ff', 500: '#3b82f6', 900: '#1e3a5f' },
    semantic: { success: '#22c55e', error: '#ef4444', warning: '#f59e0b' }
  },
  spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px' },
  font: {
    size: { sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem' },
    weight: { normal: 400, medium: 500, semibold: 600, bold: 700 }
  },
  radius: { sm: '4px', md: '8px', lg: '12px', full: '9999px' },
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 6px rgba(0,0,0,0.1)'
  }
} as const
```

## Component API Design

```typescript
// Composition pattern > prop explosion
// YANLIS:
<Button icon="check" iconPosition="left" loading loadingText="..." />

// DOGRU:
<Button>
  <Button.Icon><CheckIcon /></Button.Icon>
  <Button.Text>Save</Button.Text>
  <Button.Spinner />
</Button>

// Polymorphic component
interface ButtonProps<T extends ElementType = 'button'> {
  as?: T
  variant: 'primary' | 'secondary' | 'ghost'
  size: 'sm' | 'md' | 'lg'
}
```

## Storybook Patterns

```typescript
// Component.stories.tsx
const meta: Meta<typeof Button> = {
  component: Button,
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary'] },
    size: { control: 'radio', options: ['sm', 'md', 'lg'] }
  }
}

export const Playground: Story = { args: { variant: 'primary', children: 'Click' } }
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8 }}>
      {(['primary', 'secondary', 'ghost'] as const).map(v => (
        <Button key={v} variant={v}>{v}</Button>
      ))}
    </div>
  )
}
```

## Visual Regression Testing

```typescript
// Chromatic veya Percy ile
test('Button variants match snapshot', async ({ page }) => {
  await page.goto('/iframe.html?id=button--all-variants')
  await expect(page).toHaveScreenshot('button-variants.png', {
    maxDiffPixelRatio: 0.01
  })
})
```

## Theming

```css
/* CSS Custom Properties */
:root {
  --color-primary: #3b82f6;
  --color-bg: #ffffff;
  --color-text: #1f2937;
}

[data-theme="dark"] {
  --color-primary: #60a5fa;
  --color-bg: #111827;
  --color-text: #f9fafb;
}
```

## Checklist

- [ ] Design tokens single source of truth
- [ ] Component API composition-based (slot pattern)
- [ ] Her component'te Storybook story var
- [ ] Visual regression test aktif
- [ ] Accessibility: keyboard nav + ARIA + contrast
- [ ] Theming: CSS variables ile dark/light
- [ ] Semantic versioning + CHANGELOG
- [ ] Prop documentation (JSDoc veya MDX)
- [ ] Bundle size per-component tracked

## Anti-Patterns

- Prop explosion (10+ prop → composition kullan)
- Token'sız hardcoded değerler
- Component'te global CSS
- Story'siz component
- Theme switch'te flash (FOUC)
- Circular dependency between components
