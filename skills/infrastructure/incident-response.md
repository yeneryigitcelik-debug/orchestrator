<!-- Imported from vibecosystem/skills/incident-response-patterns (MIT) — https://github.com/vibeeval/vibecosystem -->

# Incident Response Patterns

## Severity Classification

| Level | Tanım | Response Time | Escalation |
|-------|-------|--------------|------------|
| SEV-1 | Tam kesinti, data loss | 5 dk | Tüm ekip |
| SEV-2 | Major feature bozuk | 30 dk | On-call + lead |
| SEV-3 | Minor feature bozuk | 4 saat | On-call |
| SEV-4 | Kozmetik, low impact | Sonraki iş günü | Ticket |

## Incident Response Protocol

```
1. DETECT  → Alert tetiklendi / kullanıcı bildirdi
2. TRIAGE  → Severity belirle, incident channel aç
3. ASSIGN  → Incident Commander + Responder ata
4. CONTAIN → Bleeding'i durdur (rollback, feature flag off)
5. FIX     → Root cause'u düzelt
6. VERIFY  → Fix'i doğrula (monitoring, smoke test)
7. RESOLVE → Incident kapat, stakeholder bilgilendir
8. REVIEW  → Post-incident review (48 saat içinde)
```

## Runbook Template

```markdown
# Runbook: [Service Name] - [Issue Type]

## Symptoms
- Alert: [alert name]
- Dashboard: [link]
- Expected: [normal behavior]
- Actual: [observed behavior]

## Diagnosis Steps
1. Check [metric/log/dashboard]
2. Run: `kubectl get pods -n production`
3. Check: `SELECT count(*) FROM errors WHERE ...`

## Mitigation
1. Quick fix: [rollback/restart/scale]
2. Feature flag: [disable feature X]
3. Redirect: [failover to backup]

## Escalation
- L1: [on-call engineer]
- L2: [team lead]
- L3: [CTO/VP Eng]
```

## Root Cause Analysis

### 5 Whys

```
Problem: API 500 hatası
Why 1: Database connection timeout
Why 2: Connection pool tükendi
Why 3: Slow query connection'ları tutuyor
Why 4: Missing index on frequently queried column
Why 5: Schema change review process eksik
→ Action: Schema change PR'da EXPLAIN ANALYZE zorunlu
```

## Post-Incident Review Template

```markdown
## Incident Summary
- Duration: [start - end]
- Impact: [affected users/revenue]
- Severity: SEV-[X]

## Timeline
- HH:MM - Alert triggered
- HH:MM - Incident declared
- HH:MM - Root cause identified
- HH:MM - Fix deployed
- HH:MM - Incident resolved

## Root Cause
[Detailed technical explanation]

## Action Items
- [ ] [Fix] Add missing index (owner: @dev, due: date)
- [ ] [Prevent] Add schema review step (owner: @lead)
- [ ] [Detect] Add connection pool alert (owner: @sre)
```

## Checklist

- [ ] Severity matrix tanımlı
- [ ] On-call rotation aktif
- [ ] Runbook'lar güncel
- [ ] Incident channel template hazır
- [ ] Post-incident review 48 saat içinde
- [ ] Action items tracked (Jira/Linear)
- [ ] Blameless culture enforced
- [ ] Alerting threshold'lar doğru

## Anti-Patterns

- Blame culture (kişi değil, sistem düzelt)
- Runbook'suz servis
- Post-incident review atlamak
- Alert fatigue (çok fazla false positive)
- Hotfix without rollback plan
