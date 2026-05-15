# XSS

## Ararsın
- `dangerouslySetInnerHTML={{ __html: userInput }}`
- `innerHTML = ...` ham string
- `v-html=` (Vue) sanitize edilmemiş input
- Markdown render'da `html: true` + kullanıcı input
- `eval()`, `new Function(userInput)`

## Patterns
- `dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html`
- `\.innerHTML\s*=\s*(?!['"][^<]*['"];)` (literal değilse şüpheli)
- `marked\s*\(\s*[^,]+\s*,\s*\{[^}]*html:\s*true`
- `eval\s*\(`

## Severity
- **critical**: Kullanıcı input direkt DOM'a, sanitize yok, kimlik doğrulamasız sayfada
- **high**: Auth'lu user-generated content (yorum, profil bio)
- **medium**: Admin-only ama yine sanitize eksik

## Sağ kontrol
- DOMPurify.sanitize()
- React default escape
- textContent kullanımı

## Örnek
`{"severity":"high","rule":"xss-dangerously-set","file":"src/Comment.tsx","line":28,"why":"User content sanitize'sız innerHTML'e gidiyor","fix":"DOMPurify.sanitize(comment.body) sonra render","evidence":"<div dangerouslySetInnerHTML={{__html: comment.body}} />"}`
