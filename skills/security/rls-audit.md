# RLS Audit (Row Level Security)

## Ararsın
- Supabase/Postgres tabloları `ENABLE ROW LEVEL SECURITY` yok
- RLS açık ama policy yok (= herşey reddedilir, prod break) veya `using (true)` (= herkes okur)
- Service role key client tarafında kullanılıyor
- Frontend'de `supabase.from('users').select('*')` ama RLS yok — tüm satırlar dönüyor

## Patterns
- SQL: `create table ... ;` sonrası `enable row level security` olmamış
- SQL: `create policy ... using (true)` PII tablosunda
- Client kodu: `createClient(url, SERVICE_ROLE_KEY)` browser bundle'da
- `select '*'` user-specific tablo, filter clause yok

## Severity
- **critical**: PII / payment / message tablosu RLS yok veya `using (true)`
- **high**: RLS var ama auth.uid() yerine sadece sub kontrolü, escalation mümkün
- **medium**: RLS uygun ama performans için index eksik
- **low**: Policy isimlendirme

## Örnek
`{"severity":"critical","rule":"rls-disabled-pii","file":"supabase/migrations/001_init.sql","line":18,"why":"users tablosu RLS yok, anon key ile herkes select edebilir","fix":"alter table users enable row level security; create policy own_row on users using (auth.uid() = id);","evidence":"create table users (id uuid, email text, ...);"}`
