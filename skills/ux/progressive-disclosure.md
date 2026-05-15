# Progressive Disclosure

## Ararsın
- Onboarding'de 30+ alan tek sayfada (overwhelming)
- Settings sayfasında 15+ section flat (gruplama yok)
- Advanced setting'ler default açık (yeni kullanıcı kayboluyor)
- Detay her zaman expanded (önemli aksiyon kayboluyor)

## Patterns
- Çok uzun form tek scroll
- Birden fazla collapse'siz section
- Power-user flag'leri yeni kullanıcı görür

## Severity
- **medium**: Onboarding completion düşük
- **low**: Refactor

## Doğrusu
- Step-by-step wizard (3-5 adım)
- "Advanced" toggle altında power options
- Smart defaults + edit later

## Örnek
`{"severity":"medium","rule":"onboarding-overflow","file":"src/pages/signup.tsx","line":1,"why":"İlk üyelikte 14 alan + 5 toggle tek ekranda — %62 abandon","fix":"3 adım: hesap → işyeri → tercihler. Her step 3-4 alan","evidence":"<form>{14 input + 5 switch}</form>"}`
