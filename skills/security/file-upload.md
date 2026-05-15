# File Upload

## Ararsın
- Multipart upload size limit yok (DoS)
- MIME type sadece header'dan okunuyor (spoofable)
- Filename sanitize edilmiyor (`../../etc/passwd`)
- Public URL ile serve ediliyor, virus scan yok
- Image upload ama EXIF strip yok (GPS leak)
- Storage public bucket (S3 ACL: public-read)

## Patterns
- `multer()` `limits` eksik
- `req.file.originalname` direkt path'e konuyor
- `mime-types` paketi yerine `req.file.mimetype` güveniliyor

## Severity
- **critical**: Public bucket'a executable upload kabul ediliyor
- **high**: Path traversal mümkün, size limit yok
- **medium**: MIME spoof riski
- **low**: EXIF strip eksik

## Doğrusu
- Size limit (10MB default)
- Magic byte check (file-type paketi)
- Random uuid filename, original sadece DB'de
- Private bucket + signed URL
- Image: re-encode + EXIF strip

## Örnek
`{"severity":"high","rule":"unsanitized-filename","file":"src/upload.ts","line":22,"why":"req.file.originalname path.join'e gidiyor — path traversal ile keyfi yerlere yazılır","fix":"`const name = crypto.randomUUID() + path.extname(req.file.originalname)`","evidence":"const dest = path.join('uploads', req.file.originalname)"}`
