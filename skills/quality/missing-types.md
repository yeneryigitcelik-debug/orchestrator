# Missing Types

## Ararsın
- Function parametre / return type implicit any
- External API response untyped (Zod parse yok, `.then(r => r.json())`)
- Optional vs required net değil
- React component props inline destructure ama tip yok
- `as any` veya `as unknown as X` kullanılarak çözülmüş

## Patterns
- `function fn(arg) { ... }` arg: any
- `const data = await res.json()` data: any
- `function Foo({ x, y }) { ... }` props tip yok

## Severity
- **medium**: Kritik servis untyped, runtime error riski
- **low**: Local helper tip eksik
- **info**: İyileştirme

## Doğrusu
- Explicit return type (`: Promise<User>`)
- `z.infer<typeof Schema>` runtime validate + tip
- Generic constraints
- `tsconfig: noImplicitAny: true` + `strict: true`

## Örnek
`{"severity":"medium","rule":"untyped-api-response","file":"src/api/client.ts","line":12,"why":"fetch().then(r=>r.json()) — response any, downstream tipsel hata yakalanmıyor","fix":"const Schema = z.object({...}); return Schema.parse(await r.json());","evidence":"export const getUser = (id) => fetch(`/api/users/${id}`).then(r => r.json())"}`
