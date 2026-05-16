# Onboarding

## Ararsın
- İlk girişte boş dashboard, kullanıcı ne yapacak bilmiyor
- Onboarding checklist yok / kapatılamıyor
- "Demo data" yok (gerçek veri girene kadar boş)
- Email confirmation flow takılmış (link expire çok kısa)
- Welcome modal hep çıkıyor (dismiss kalıcı değil)

## Patterns
- Empty state'te primary CTA yok
- Hesap açma sonrası `/dashboard` direkt (orientation yok)
- Modal dismiss localStorage'e yazılmıyor

## Severity
- **high**: D1 retention <%20
- **medium**: Empty state CTA yok
- **low**: Polish

## Doğrusu
- Welcome wizard 3-5 step (skip option)
- Empty state primary CTA (ilk eylem)
- Sample data / template hesap
- Onboarding checklist persistent (DB)

## Örnek
`{"severity":"medium","rule":"empty-state-no-cta","file":"src/pages/Customers.tsx","line":8,"why":"İlk kullanıcı 'No customers' görüyor, ne yapacağını bilmiyor","fix":"Empty state illüstrasyon + 'Yeni müşteri ekle' primary button + CSV import secondary","evidence":"{customers.length === 0 && <p>No customers</p>}"}`
