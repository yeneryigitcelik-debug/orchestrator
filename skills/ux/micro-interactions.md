# Micro-Interactions

## Ararsın
- Buton click → hiçbir feedback (cursor değişmiyor, ripple yok, disabled state yok)
- Hover state yok interactive element'lerde
- Loading state: "Save" butonu basıldıktan sonra hala "Save", spinner yok
- Form validation feedback'i sadece submit'te (her field'a inline tepki yok)
- Transition / animation çok agresif (300ms+ blocking)
- Page transition yok — beyaz flash

## Patterns
- `<button disabled={loading}>` ama spinner/yazı değişmiyor
- Click sonrası 2 saniye sessiz — kullanıcı tekrar tıklıyor
- `transition: all` (perf riskli)

## Severity
- **medium**: Submit sonrası feedback yok, çift submit
- **low**: Hover/focus iyileştirilebilir
- **info**: Animation polish

## Doğrusu
- Loading state: spinner + disable + label "Kaydediliyor..."
- Optimistic UI (React Query)
- Inline validation `onBlur`
- Skeleton screen list loading
- 150-200ms transition (perceptible, fast)

## Örnek
`{"severity":"medium","rule":"no-loading-feedback","file":"src/pages/Settings.tsx","line":62,"why":"Save butonu submit edildikten sonra hala 'Save' — kullanıcı 3 kez basıyor","fix":"`<Button disabled={pending}>{pending ? 'Kaydediliyor…' : 'Kaydet'}</Button>` + spinner","evidence":"<button onClick={save}>Save</button>"}`
