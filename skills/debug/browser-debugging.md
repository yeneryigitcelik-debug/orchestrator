<!-- Imported from vibecosystem/skills/browser-debugging (MIT) — https://github.com/vibeeval/vibecosystem -->

# Browser Debugging (Chrome DevTools MCP)

## Chrome DevTools MCP Setup

### Kurulum

```bash
# NPM ile
npm install -g @anthropic/chrome-devtools-mcp

# veya npx ile (kurulum gerektirmez)
npx @anthropic/chrome-devtools-mcp
```

### MCP Config (~/.mcp.json)

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "@anthropic/chrome-devtools-mcp"],
      "env": {
        "CHROME_DEVTOOLS_PORT": "9222"
      }
    }
  }
}
```

### Chrome'u Debug Modunda Baslat

```bash
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-debug

# Linux
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug

# Headless mod
google-chrome --headless --remote-debugging-port=9222
```

## Console Log Okuma ve Analiz

### Console Mesajlarini Yakala

```
devtools.get_console_logs({
  level: "error",     // log | warn | error | info | debug
  limit: 50,
  clear_after: false
})
```

### Console Mesaj Analizi

| Seviye | Anlam | Aksiyon |
|--------|-------|---------|
| error | Runtime hatasi | HEMEN fix et |
| warn | Potansiyel sorun | Incele, gerekiyorsa fix |
| info | Bilgi mesaji | Debug icin kullan |
| log | Debug output | Temizle (production'da olmamali) |

### Yaygin Console Hatalari

```
// TypeError: Cannot read properties of undefined
→ Null check eksik, optional chaining kullan: obj?.prop

// CORS error
→ Backend'de Access-Control-Allow-Origin header eksik

// Uncaught Promise rejection
→ async/await'te try/catch eksik

// React: Each child should have a unique key
→ map() icinde key={unique_id} ekle

// React: Maximum update depth exceeded
→ useEffect dependency array'de sonsuz dongu
```

## Network Request Izleme

### Request'leri Listele

```
devtools.get_network_requests({
  url_filter: "/api/",
  method: "POST",
  status_code: 500,
  limit: 20
})
```

### Request Detayi

```
devtools.get_request_detail({
  request_id: "req-123",
  include_body: true,
  include_headers: true
})
```

### Network Analiz Tablosu

| Metrik | Iyi | Kotu | Kontrol |
|--------|-----|------|---------|
| TTFB | <200ms | >600ms | Server response suresi |
| Download | <100ms | >500ms | Payload buyuklugu |
| Total time | <500ms | >2s | Butun pipeline |
| Payload size | <100KB | >1MB | Compression, pagination |
| Request count | <50/sayfa | >100/sayfa | Batching, caching |

### Yaygin Network Sorunlari

```
Status 401 → Token expired, auth flow kontrol et
Status 403 → Permission eksik, RBAC kontrol et
Status 404 → URL yanlis, routing kontrol et
Status 429 → Rate limited, backoff ekle
Status 500 → Server error, backend log'lara bak
Status 502 → Proxy/gateway sorunu, infra kontrol et
CORS error → Preflight (OPTIONS) basarisiz
Mixed content → HTTPS sayfada HTTP request
```

## Performance Profiling

### Performance Snapshot

```
devtools.get_performance_metrics({
  include_timing: true,
  include_memory: true
})
```

### Core Web Vitals Olcumu

```
devtools.evaluate_expression({
  expression: `
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        console.log(entry.name, entry.value || entry.startTime);
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  `
})
```

### Performance Metrikleri

| Metrik | Hedef | Olcum |
|--------|-------|-------|
| LCP | <2.5s | En buyuk elementin renderlanma suresi |
| FID/INP | <100ms | Ilk input'a tepki suresi |
| CLS | <0.1 | Gorsel kayma skoru |
| FCP | <1.8s | Ilk icerigin gorundugu an |
| TTI | <3.8s | Tamamen interaktif olma suresi |
| TBT | <200ms | Main thread bloklanma suresi |

### Performance Anti-Patterns

```
1. Layout thrashing: DOM oku/yaz/oku/yaz (batch et)
2. Forced reflow: offsetHeight gibi prop'lar reflow tetikler
3. Unoptimized images: WebP/AVIF kullan, lazy load et
4. Render blocking CSS: Critical CSS inline, gerisi async
5. Long tasks: 50ms+ main thread task'lari parcala
6. Excessive DOM: 1500+ node varsa virtual scroll kullan
```

## DOM Inspection

### Element Sec ve Incele

```
devtools.query_selector({
  selector: "#main-content .card",
  include_styles: true,
  include_attributes: true
})
```

### DOM Tree

```
devtools.get_dom_tree({
  depth: 3,
  root_selector: "#app"
})
```

### Element Sayisi Kontrol

```
devtools.evaluate_expression({
  expression: "document.querySelectorAll('*').length"
})
// 1500+ ise performance sorunu
```

### Computed Styles

```
devtools.get_computed_styles({
  selector: ".problematic-element",
  properties: ["display", "position", "z-index", "overflow"]
})
```

## JavaScript Debugging

### Expression Evaluate Et

```
devtools.evaluate_expression({
  expression: "JSON.stringify(window.__NEXT_DATA__, null, 2)"
})
```

### State Inspection (React)

```
devtools.evaluate_expression({
  expression: `
    // React DevTools hook
    const fiber = document.querySelector('#root')._reactRootContainer?._internalRoot?.current;
    JSON.stringify(fiber?.memoizedState, null, 2);
  `
})
```

### Event Listener Kontrolu

```
devtools.evaluate_expression({
  expression: `
    const el = document.querySelector('.button');
    getEventListeners(el);
  `
})
```

### Breakpoint Yonetimi

```
// Conditional breakpoint
devtools.set_breakpoint({
  url: "main.js",
  line: 42,
  condition: "user.role === 'admin'"
})

// DOM breakpoint
devtools.set_dom_breakpoint({
  selector: "#dynamic-content",
  type: "subtree-modifications"  // subtree-modifications | attribute-modifications | node-removal
})
```

## Memory Leak Tespiti

### Heap Snapshot

```
devtools.take_heap_snapshot({
  include_summary: true
})
```

### Memory Timeline

```
devtools.get_memory_info()
// Response: { jsHeapSizeLimit, totalJSHeapSize, usedJSHeapSize }
```

### Memory Leak Tespiti Adimlari

```
1. Baslangic heap snapshot al
2. Suphelenen aksiyonu yap (navigate, modal ac/kapa)
3. GC tetikle (devtools uzerinden)
4. Ikinci heap snapshot al
5. Comparison view'da "Detached" DOM node'lari ara
6. Retained size buyuk olan objeleri incele
```

### Yaygin Memory Leak Sebepleri

| Sebep | Cozum |
|-------|-------|
| Event listener temizlenmemis | useEffect return cleanup |
| setInterval temizlenmemis | clearInterval in cleanup |
| Detached DOM | removeChild + null referans |
| Closure capturing | WeakRef veya scope daralt |
| Global degisken birikimi | Scope'a al, gereksizini sil |
| WebSocket kapatilmamis | close() in cleanup |

## CSS Debugging

### CSS Coverage

```
devtools.get_css_coverage({
  url_filter: "styles.css"
})
// Kullanilmayan CSS oranini goster
```

### Layout Sorunlari

```
// Overflow tespiti
devtools.evaluate_expression({
  expression: `
    [...document.querySelectorAll('*')].filter(el => {
      return el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
    }).map(el => ({
      tag: el.tagName,
      class: el.className,
      overflow: { w: el.scrollWidth - el.clientWidth, h: el.scrollHeight - el.clientHeight }
    }));
  `
})
```

### Z-index Debugging

```
devtools.evaluate_expression({
  expression: `
    [...document.querySelectorAll('*')]
      .filter(el => getComputedStyle(el).zIndex !== 'auto')
      .map(el => ({
        tag: el.tagName,
        class: el.className,
        zIndex: getComputedStyle(el).zIndex,
        position: getComputedStyle(el).position
      }))
      .sort((a, b) => Number(b.zIndex) - Number(a.zIndex));
  `
})
```

### CSS Anti-Patterns

| Anti-Pattern | Dogru Yol |
|-------------|-----------|
| !important kullanimi | Specificity'yi artir |
| Inline style | Class/utility kullan |
| Magic number z-index | z-index scale tanimla |
| Fixed px font size | rem/em kullan |
| * selector | Spesifik selector |

## Lighthouse Audit

### Programmatic Lighthouse

```
devtools.run_lighthouse({
  url: "http://localhost:3000",
  categories: ["performance", "accessibility", "best-practices", "seo"],
  form_factor: "mobile"  // mobile | desktop
})
```

### Lighthouse Skor Hedefleri

| Kategori | Minimum | Hedef |
|----------|---------|-------|
| Performance | 70 | 90+ |
| Accessibility | 80 | 100 |
| Best Practices | 80 | 100 |
| SEO | 80 | 100 |

### Accessibility Kontrolleri

```
devtools.evaluate_expression({
  expression: `
    // Eksik alt text
    [...document.querySelectorAll('img:not([alt])')].length;
  `
})

devtools.evaluate_expression({
  expression: `
    // Eksik label
    [...document.querySelectorAll('input:not([aria-label]):not([id])')].length;
  `
})
```

## Real-Time Browser State Inspection

### Page State

```
devtools.get_page_info()
// Response: url, title, status, loading_state
```

### Tab Yonetimi

```
// Tum tab'lari listele
devtools.list_targets()

// Tab'a baglan
devtools.attach_to_target({ target_id: "target-123" })
```

### Screenshot

```
devtools.take_screenshot({
  format: "png",
  quality: 80,
  full_page: true
})
```

### Cookie Inspection

```
devtools.get_cookies({
  url: "http://localhost:3000"
})
```

### Local/Session Storage

```
devtools.evaluate_expression({
  expression: `
    ({
      localStorage: Object.keys(localStorage).reduce((acc, key) => {
        acc[key] = localStorage.getItem(key);
        return acc;
      }, {}),
      sessionStorage: Object.keys(sessionStorage).reduce((acc, key) => {
        acc[key] = sessionStorage.getItem(key);
        return acc;
      }, {})
    })
  `
})
```

## Debug Workflow

### Sistematik Debug Adimlari

```
1. REPRODUCE
   - Console log'lari oku (error seviyesi)
   - Network request'leri incele (4xx/5xx)
   - Screenshot al (goruntuyu dogrula)

2. ISOLATE
   - DOM inspect et (element var mi, dogru mu)
   - CSS kontrol et (gorunum sorunu mu)
   - JS evaluate et (state dogru mu)
   - Network filtrele (hangi request basarisiz)

3. DIAGNOSE
   - Performance profil al (yavas mi)
   - Memory kontrol et (leak var mi)
   - Lighthouse calistir (genel skor)

4. FIX & VERIFY
   - Kodu duzelt
   - Browser'da tekrar kontrol et
   - Console temiz mi
   - Network basarili mi
   - Performance iyilesti mi
```

## Entegrasyon: browser-use MCP

Mevcut browser-use MCP ile birlikte kullanim:

```
browser-use: Sayfa navigasyon, form doldurma, tikla, icerik cek
chrome-devtools: Console, network, performance, DOM, memory analizi

Workflow:
1. browser-use ile sayfaya git
2. chrome-devtools ile console error kontrol
3. chrome-devtools ile network analiz
4. browser-use ile interaksiyon yap
5. chrome-devtools ile performance olc
```
