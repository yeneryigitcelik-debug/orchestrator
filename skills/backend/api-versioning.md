<!-- Imported from vibecosystem/skills/api-versioning-patterns (MIT) — https://github.com/vibeeval/vibecosystem -->

# API Versioning Patterns

## Versioning Strategies

| Strateji | Örnek | Pros | Cons |
|----------|-------|------|------|
| URL Path | `/v1/users` | Açık, cache-friendly | URL kirliliği |
| Header | `Accept: application/vnd.api+json;v=2` | Clean URL | Debug zor |
| Query Param | `/users?version=2` | Basit | Cache sorunlu |
| Content Negotiation | `Accept: application/vnd.company.v2+json` | RESTful | Karmaşık |

**Öneri:** URL Path (`/v1/`) — en yaygın, en anlaşılır.

## Breaking Change Detection

```typescript
// Breaking changes
const breakingChanges = [
  'Required field ekleme',
  'Field silme veya rename',
  'Type değiştirme (string → number)',
  'Enum value silme',
  'Response structure değiştirme',
  'Error code değiştirme',
  'Auth requirement ekleme'
]

// Non-breaking changes
const nonBreaking = [
  'Optional field ekleme',
  'Yeni endpoint ekleme',
  'Enum value ekleme',
  'Response'a optional field ekleme',
  'Performance improvement'
]
```

## Deprecation Lifecycle

```
Phase 1: ANNOUNCE (3 ay önce)
  → Deprecation header: Sunset: Sat, 01 Jan 2027 00:00:00 GMT
  → API docs'ta uyarı
  → Consumer'lara email

Phase 2: WARN (2 ay önce)
  → Response header: Deprecation: true
  → Log: deprecated endpoint kullanımı
  → Dashboard: kullanım metrikleri

Phase 3: THROTTLE (1 ay önce)
  → Rate limit düşür
  → Warning response body'ye ekle

Phase 4: SUNSET
  → 410 Gone döndür
  → Migration guide link'i ile
```

## Migration Guide Template

```markdown
# Migration: v1 → v2

## Breaking Changes
1. `GET /v1/users` → `GET /v2/users`
   - Response: `{ data: User[] }` → `{ items: User[], meta: {...} }`
2. `POST /v1/orders`
   - New required field: `currency` (ISO 4217)

## Step-by-Step
1. Update client SDK to v2
2. Add `currency` field to order creation
3. Update response parsing for `items` + `meta`
4. Test against v2 staging
5. Switch production to v2

## Compatibility Period
v1 available until: 2027-06-01
```

## Checklist

- [ ] Versioning stratejisi seçilmiş
- [ ] Breaking change policy documented
- [ ] Deprecation lifecycle tanımlı
- [ ] Sunset header ekleniyor
- [ ] Migration guide var
- [ ] Version usage metrikleri tracked
- [ ] Consumer notification sistemi var
- [ ] Minimum 6 ay backward compatibility

## Anti-Patterns

- Version'sız API (her değişiklik breaking)
- Eski version'u ani kapatma (sunset lifecycle uygula)
- Breaking change without version bump
- Her küçük değişiklikte yeni version
- Consumer'lara haber vermeden deprecate
