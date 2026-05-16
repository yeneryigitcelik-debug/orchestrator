# Microcopy

## Ararsın
- Generic error: "Error", "Something went wrong" — user ne yapsın?
- Buton: "Submit", "OK" yerine aksiyona özel ("Save changes", "Send invoice")
- Boş data: "No data" yerine bağlama özel ("Henüz fatura yok — yeni fatura oluşturmak için...")
- Form label/placeholder Türkçe-İngilizce karışık (tutarsız dil)
- Toast/banner çok teknik ("Error 5xx: ECONNREFUSED")

## Patterns
- `"Error"`, `"Failed"`, `"OK"` yaygın
- `placeholder="Enter email"` ama label yok
- Türkçe app, İngilizce buton ("Submit")

## Severity
- **high**: Hata mesajı kullanıcıyı çıkmaza sokuyor
- **medium**: Generic copy yaygın
- **low**: Naming/tone iyileştirme

## Doğrusu
- Empathic + actionable: "Maalesef kaydedilemedi. Tekrar dene veya destek ekibine yaz."
- Buton aksiyona özel: "Faturayı kaydet"
- Tutarlı dil
- Hata: kullanıcının ne yapacağı net

## Örnek
`{"severity":"high","rule":"unhelpful-error","file":"src/components/Toast.tsx","line":10,"why":"`Error occurred` mesajı — kullanıcı ne yapsın? Sözleşmeyi tekrarla mı, destek mi?","fix":"Bağlamsal: \"Fatura kaydedilemedi: müşteri bilgileri eksik. Müşteri ekranından tamamla.\"","evidence":"toast.error('Error occurred')"}`
