# Test Coverage

## Ararsın
- Core servis (payment, auth, billing) için unit test yok
- Test klasörü var ama smoke test seviyesinde
- Test framework yapılandırılmamış (jest/vitest config yok)
- Tip test edilmiyor — Zod schema değişikliği tüm projeyi etkiliyor ama test yok
- E2E hiç yok (Playwright/Cypress)

## Patterns
- `src/services/payment.ts` var, `payment.test.ts` yok
- `vitest.config.ts` / `jest.config.js` yok
- `coverage/` raporu yok / CI'da kontrol yok

## Severity
- **high**: Core modül (auth, payment, billing) sıfır test
- **medium**: Coverage <%30, kritik path test yok
- **low**: Best practice

## Doğrusu
- Unit: vitest + tanımlı zorunlu coverage
- Integration: real DB (testcontainers)
- E2E: Playwright smoke
- CI: coverage threshold

## Örnek
`{"severity":"high","rule":"core-untested","file":"src/services/billing.ts","line":1,"why":"Faturalandırma servisi 600 satır, 0 test — regression riski yüksek","fix":"vitest + test caseleri: amount calc, prorate, refund","evidence":"src/services/billing.ts (file exists, no billing.test.ts in tree)"}`
