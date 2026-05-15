# `any` Types

## Ararsın
- Explicit `: any` annotation
- Implicit any: noImplicitAny kapalı veya parametre tip yok
- `as any` cast (escape hatch abuse)
- `as unknown as X` çift cast (tip belirsizliğini gizliyor)
- Generic'in `T = any` default

## Patterns
- `function f(x: any)` 
- `const y = z as any`
- `Record<string, any>` veriliyor, tip belli olmalıdır
- `// @ts-ignore` / `// @ts-expect-error` justification yok

## Severity
- **high**: Tip sistemini tamamen kapatan `as any` core modülde
- **medium**: Geniş `any` kullanımı 20+ yer
- **low**: Tek `any`, tip belirsiz 3rd party

## Doğrusu
- `unknown` + narrow
- Generic constraint
- Zod parse → typed
- DTO mapping

## Örnek
`{"severity":"medium","rule":"explicit-any","file":"src/utils/api.ts","line":7,"why":"`fetch wrapper response: any` — caller tip güvencesi yok, runtime error olası","fix":"`function fetchJson<T>(url): Promise<T>` ya da `z.infer<typeof Schema>`","evidence":"export async function fetchJson(url: string): Promise<any> { return (await fetch(url)).json(); }"}`
