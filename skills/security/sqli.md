# SQL Injection

## Ararsın
- Raw SQL'e kullanıcı input'u string concat / template literal ile gömülmüş
- ORM raw query'lerde `${user}` interpolation
- Dynamic ORDER BY / table name kullanıcıdan

## Patterns
- `db.query(\`SELECT ... ${var}\`)` (template literal)
- `db.query("SELECT ... " + req.body.x)` (concat)
- `knex.raw('... ' + input)`
- Supabase RPC param tip kontrolü olmadan

## Severity
- **critical**: Doğrudan req.body/req.query string concat, kimliği doğrulanmamış endpoint
- **high**: Authenticated endpoint ama yine SQL injection mümkün
- **medium**: Internal-only ama yine de güvensiz pattern

## Sağ kontrol
- `$1, $2` parameterized (pg)
- `?` placeholder (mysql2)
- ORM builder method'ları (where, select)
- Bind params

## Örnek
`{"severity":"critical","rule":"sql-injection-raw","file":"src/api/users.ts","line":34,"why":"req.query.q template literal ile SQL'e yazılıyor — UNION SELECT açığı","fix":"pool.query('... where name = $1', [q]) parameterized kullan","evidence":"db.query(\`SELECT * FROM u WHERE n='${req.query.q}'\`)"}`
