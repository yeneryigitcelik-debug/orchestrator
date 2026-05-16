# MCP Server

Model Context Protocol sunucusu kur — bir LLM/agent'a tool, kaynak ve prompt sağla.

## Ne yap
- Resmi SDK kullan (`@modelcontextprotocol/sdk`); protokolü elle implemente etme.
- Taşımayı göreve göre seç: yerel süreç için `stdio`, uzak/çok-istemci için HTTP/SSE.
- Her tool'a net `name`, açıklama ve JSON Schema input tanımı ver — agent şemadan anlar.
- Tool girdisini sunucuda doğrula (şema + iş kuralı); agent'tan geleni güvenme.
- Tool dönüşü kısa ve yapılandırılmış olsun — agent context'ini şişiren dev metinler döndürme.
- Hatayı tool sonucunda açık raporla (`isError`), sunucuyu çökertme.
- stdio sunucuda `stdout`'a SADECE protokol mesajı yaz; log'u `stderr`'e ver.
- Uzun işlerde zaman aşımı ve iptal desteği; sırları env'den oku.

## Kırmızı bayraklar
- stdio sunucuda `console.log` ile stdout'a yazıp JSON-RPC akışını bozmak.
- Tool input'u şemasız veya doğrulamasız — agent çöp gönderince patlama.
- Tool tek seferde devasa çıktı döndürüp agent context'ini doldurma.
- Tool hatası exception olarak fırlayıp tüm sunucuyu düşürüyor.
- Sır tool koduna gömülü.
