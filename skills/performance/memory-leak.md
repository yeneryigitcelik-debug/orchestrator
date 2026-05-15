# Memory Leak

## Ararsın
- Sınırsız büyüyen module-level cache (`const cache = new Map()` evict yok)
- EventEmitter listener leak (her request `on()` ekliyor, off yok)
- `setInterval` çağrısı temizlenmiyor (close handler yok)
- Detached DOM (React tarafında: setState'i unmounted component'e atılıyor)
- Large closure tutulan request scope

## Patterns
- `new Map()` veya `{}` module-level scope'ta, key sayısı bound yok
- `process.on(...)` / `socket.on(...)` ama unsubscribe yok
- `useEffect(() => { setInterval(...) }, [])` cleanup yok

## Severity
- **high**: Production saatte 1GB+ RSS artıyor, restart şart
- **medium**: Yavaş leak (1GB/gün)
- **low**: Potansiyel ama miktarı küçük

## Doğrusu
- LRU cache (`lru-cache` paketi) max size
- Listener add/remove pair
- `useEffect` cleanup return
- Heap snapshot karşılaştırma

## Örnek
`{"severity":"high","rule":"unbounded-map-cache","file":"src/cache.ts","line":4,"why":"Module-level Map sınırsız büyüyor, prod heap 4GB+","fix":"LRUCache({max: 1000}) veya periodic flush","evidence":"const cache = new Map(); export const set = (k,v) => cache.set(k,v);"}`
