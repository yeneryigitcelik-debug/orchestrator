# User Flow

## Ararsın
- Multi-step form: prev/next yok, kullanıcı baştan
- Geri tuşu state'i kaybediyor (URL state yok)
- Confirmation step yok kritik aksiyonda (silme, ödeme)
- Onboarding adımları arasında ilerleme göstergesi yok
- 404/empty state'te next action yok ("Anasayfaya dön" yok)
- Modal kapanınca arkadaki state sıfırlanıyor

## Patterns
- `<form>` 6+ field tek sayfada, step yok
- `onSubmit` confirm dialog yok delete'te
- `useState` ile step state ama URL'de yok

## Severity
- **critical**: Sil/öde gibi geri alınamayan aksiyonda confirm yok
- **high**: Multi-step yarıda kalınca tekrar
- **medium**: Empty state next action yok
- **low**: İyileştirme

## Doğrusu
- URL-state (`?step=2`) — geri/refresh güvenli
- Confirm dialog destructive aksiyonda
- Empty state'te primary CTA
- Progress indicator multi-step

## Örnek
`{"severity":"critical","rule":"destructive-no-confirm","file":"src/pages/Settings.tsx","line":42,"why":"`onDeleteAccount` butona basınca direkt silme — confirm yok","fix":"AlertDialog ile çift onay (\"hesabınızı yazın\")","evidence":"<button onClick={deleteAccount}>Delete account</button>"}`
