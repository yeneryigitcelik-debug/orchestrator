# RLS Policy Quality

## Ararsın
- Policy var ama `auth.uid()` kontrolü tutarsız (using vs with check)
- Multi-tenant tabloda `tenant_id = auth.tenant_id()` yerine sadece `user_id`
- Service role her yerde — RLS by-pass riski
- Policy karmaşıklığı: 3+ subquery → query yavaş
- Service-role only function `security definer` ama `set search_path` yok

## Patterns
- `using (auth.uid() = user_id)` ama `with check` yok → insert mümkün başkasına
- `security definer` function `set search_path = public` yok → search_path attack

## Severity
- **high**: with check eksik (cross-tenant insert mümkün)
- **medium**: Policy doğru ama performans için indeks eksik
- **low**: İsimlendirme

## Doğrusu
- `using` (select için) + `with check` (insert/update için) ikisi de
- `set search_path = ''` security definer fonksiyonlarda
- Performance için `auth.uid()`'in stabil olduğu yer

## Örnek
`{"severity":"high","rule":"rls-with-check-missing","file":"supabase/migrations/0012_posts_rls.sql","line":4,"why":"insert için with check yok, bir user başka user_id ile post insert edebilir","fix":"create policy ins_own on posts for insert with check (auth.uid() = user_id);","evidence":"create policy sel_own on posts for select using (auth.uid() = user_id);"}`
