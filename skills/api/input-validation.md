# Input Validation

## Ararsın
- `req.body` / `req.query` / `req.params` direkt kullanılıyor, schema validation yok
- Zod / Joi / Yup / valibot kullanılmamış
- Tip yok (`any`) endpoint girdisinde
- Length / format kontrolü yok (email, uuid, max length)
- `JSON.parse(req.body)` ham parse, try/catch yok

## Patterns
- Hono/Express handler: `const x = await req.json(); db.query(x.id)` — validate yok
- Tip belli ama runtime check eksik

## Severity
- **critical**: Public endpoint, validation hiç yok, DB'ye ham gidiyor
- **high**: Auth'lu endpoint validation eksik
- **medium**: Length/format eksik ama tip kontrolü var
- **low**: Mesaj iyileştirme

## Doğrusu
- `const parsed = Schema.safeParse(body); if (!parsed.success) return 400`
- OpenAPI/zod-openapi ile contract
- Required field + max length

## Örnek
`{"severity":"high","rule":"unvalidated-body","file":"src/api/users/create.ts","line":10,"why":"req.body direkt insert'e gidiyor, tip/length yok","fix":"const Schema = z.object({email: z.string().email(), name: z.string().max(120)}); Schema.safeParse(body)","evidence":"const body = await req.json(); await db.insert(body)"}`
