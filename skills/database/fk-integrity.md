# Foreign Key Integrity

## Ararsın
- `_id` kolon var ama FK constraint yok
- ON DELETE / ON UPDATE davranışı yok
- FK var ama `DEFERRABLE` gereken yerde değil
- Soft delete patternde FK aktif → ölü referans

## Patterns
- SQL: `user_id uuid` var ama `references users(id)` yok
- FK var ama `on delete no action` ve uygulamada cascade bekleniyor

## Severity
- **high**: Kritik tabloda FK yok, orphan satır oluşabilir
- **medium**: FK var ama ON DELETE belirsiz
- **low**: İsimlendirme

## Doğrusu
- Her ilişki için explicit FK
- ON DELETE CASCADE / SET NULL / RESTRICT kararını al
- Tablo bağımlılık grafiği netleştir

## Örnek
`{"severity":"high","rule":"missing-fk","file":"migrations/0010_invoices.sql","line":8,"why":"invoices.customer_id uuid ama FK yok — silinen müşteri için orphan invoice","fix":"references customers(id) on delete restrict ekle","evidence":"create table invoices (id uuid pk, customer_id uuid, amount int);"}`
