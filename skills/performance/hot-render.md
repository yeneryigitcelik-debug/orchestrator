# Hot Render Path

## Ararsın
- React component'inde object/array re-create her render'da (`{ x: 1 }`, `[]`) → child memo bypass
- `useCallback`/`useMemo` deps yanlış (sürekli yeniden hesap)
- Pahalı hesap render içinde (sort/filter big array)
- `key={index}` reorderla aynı slot'a farklı item düşüyor → re-mount
- `Context.Provider` value her render değişiyor → tüm consumer re-render

## Patterns
- `<Child x={{a:1}}>` JSX inline obj
- `useMemo(() => ..., [obj])` obj her render yeni
- `data.sort()` (mutates + N log N hot)

## Severity
- **medium**: Belirgin jank (DevTools profiler 50ms+ render)
- **low**: Minör, optimization fırsatı

## Doğrusu
- Stable refs (useMemo + primitive deps, useCallback)
- Provider value useMemo
- Heavy compute web worker veya server-side
- `useMemo(() => [...data].sort(...), [data])`

## Örnek
`{"severity":"medium","rule":"context-value-unstable","file":"src/AppProvider.tsx","line":12,"why":"Provider value={{ user, setUser }} inline obj — tüm consumer'lar her parent render'da re-render","fix":"const value = useMemo(() => ({user, setUser}), [user])","evidence":"<AuthContext.Provider value={{user, setUser}}>"}`
