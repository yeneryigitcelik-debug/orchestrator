<!-- Imported from vibecosystem/skills/accessibility-patterns (MIT) — https://github.com/vibeeval/vibecosystem -->

# Accessibility Patterns

## WCAG 2.2 AA Requirements

### Perceivable

| Kriter | Kural | Kontrol |
|--------|-------|---------|
| 1.1.1 | Non-text content alt text | `<img alt="description">` |
| 1.3.1 | Semantic HTML | Headings, landmarks, lists |
| 1.4.3 | Color contrast | 4.5:1 normal text, 3:1 large |
| 1.4.11 | UI component contrast | 3:1 borders, icons |

### Operable

| Kriter | Kural | Kontrol |
|--------|-------|---------|
| 2.1.1 | Keyboard accessible | Tab, Enter, Space, Escape |
| 2.4.3 | Focus order | Logical tab sequence |
| 2.4.7 | Focus visible | Visible focus indicator |
| 2.5.8 | Target size | Min 24x24px (44x44px önerilir) |

### Understandable

| Kriter | Kural | Kontrol |
|--------|-------|---------|
| 3.1.1 | Language of page | `<html lang="tr">` |
| 3.2.1 | On focus | No unexpected context change |
| 3.3.1 | Error identification | Clear error messages |
| 3.3.2 | Labels or instructions | Form labels visible |

## ARIA Patterns

```html
<!-- Dialog -->
<div role="dialog" aria-modal="true" aria-labelledby="title">
  <h2 id="title">Confirm</h2>
  <button aria-label="Close dialog">×</button>
</div>

<!-- Tabs -->
<div role="tablist">
  <button role="tab" aria-selected="true" aria-controls="panel1">Tab 1</button>
  <button role="tab" aria-selected="false" aria-controls="panel2">Tab 2</button>
</div>
<div role="tabpanel" id="panel1">Content 1</div>

<!-- Live region (dynamic updates) -->
<div aria-live="polite" aria-atomic="true">
  3 new messages
</div>
```

## Keyboard Navigation

```typescript
// Focus trap (modal/dialog)
function useFocusTrap(ref: RefObject<HTMLElement>) {
  useEffect(() => {
    const focusable = ref.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable?.[0] as HTMLElement
    const last = focusable?.[focusable.length - 1] as HTMLElement

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus()
      }
    }
    ref.current?.addEventListener('keydown', handleKeyDown)
    first?.focus()
    return () => ref.current?.removeEventListener('keydown', handleKeyDown)
  }, [ref])
}
```

## Skip Links

```html
<a href="#main-content" class="skip-link">Skip to main content</a>
<!-- ... navigation ... -->
<main id="main-content">...</main>

<style>
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  z-index: 100;
}
.skip-link:focus { top: 0; }
</style>
```

## Motion Preferences

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Testing

```bash
# axe-core (automated)
npx @axe-core/cli https://localhost:3000

# Lighthouse accessibility audit
lighthouse --only-categories=accessibility https://localhost:3000
```

## Checklist

- [ ] Semantic HTML (headings, landmarks, lists)
- [ ] Alt text on all images
- [ ] Color contrast 4.5:1 (text), 3:1 (UI)
- [ ] Keyboard navigable (tab order logical)
- [ ] Focus visible indicator
- [ ] Skip link to main content
- [ ] Form labels and error messages
- [ ] ARIA roles where needed
- [ ] prefers-reduced-motion respected
- [ ] axe-core test pass

## Anti-Patterns

- `<div onclick>` instead of `<button>`
- Color-only information (add icon/text)
- Auto-playing video/audio
- Removing focus outline without replacement
- Using ARIA when native HTML suffices
