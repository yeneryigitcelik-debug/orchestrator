<!-- Imported from vibecosystem/skills/cost-optimization-patterns (MIT) — https://github.com/vibeeval/vibecosystem -->

# Cost Optimization Patterns

## Cloud Cost Optimization

### Right-Sizing

```bash
# AWS - Compute Optimizer önerileri
aws compute-optimizer get-ec2-instance-recommendations

# CPU/Memory utilization < 20% → downsize
# CPU/Memory utilization > 80% → upsize veya auto-scale
```

### Instance Strategy

| Strateji | Tasarruf | Risk | Use Case |
|----------|---------|------|----------|
| On-Demand | 0% | Düşük | Değişken workload |
| Reserved (1yr) | %30-40 | Orta | Steady-state |
| Reserved (3yr) | %50-60 | Yüksek | Uzun vadeli |
| Spot/Preemptible | %60-90 | Yüksek | Batch, CI/CD |
| Savings Plans | %30-50 | Düşük | Flexible commitment |

### Serverless Cost

```
Lambda cost = (requests × $0.20/1M) + (GB-seconds × $0.0000166)

Optimizasyon:
1. Memory right-sizing (power tuning)
2. Provisioned concurrency (cold start vs cost tradeoff)
3. ARM architecture (%20 ucuz)
4. Batch processing (SQS batch size)
```

## LLM/API Token Cost

```typescript
// Token maliyet takibi
const MODEL_COSTS = {
  'claude-opus-4-6':   { input: 15.0, output: 75.0 },   // per 1M tokens
  'claude-sonnet-4-6': { input: 3.0,  output: 15.0 },
  'claude-haiku-4-5':  { input: 0.80, output: 4.0 }
} as const

function estimateCost(model: string, inputTokens: number, outputTokens: number) {
  const costs = MODEL_COSTS[model]
  return (inputTokens * costs.input + outputTokens * costs.output) / 1_000_000
}
```

## Build Time Optimization

| Teknik | Tasarruf | Karmaşıklık |
|--------|---------|-------------|
| Dependency caching | %30-50 | Düşük |
| Parallel test execution | %40-60 | Düşük |
| Incremental builds | %50-70 | Orta |
| Docker layer caching | %20-40 | Düşük |
| Affected-only (monorepo) | %60-80 | Orta |

## Database Cost

```sql
-- Pahalı query'leri bul
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;

-- Unused index'leri bul (gereksiz storage + write overhead)
SELECT indexrelname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexrelname NOT LIKE '%pkey%';
```

## Checklist

- [ ] Cloud cost alerting aktif (budget alarm)
- [ ] Unused resources temizlenmiş
- [ ] Right-sizing review (aylık)
- [ ] Reserved/Spot instance kullanımı
- [ ] CDN cache hit ratio >90%
- [ ] Database query optimization
- [ ] Build cache aktif
- [ ] Tag-based cost allocation

## Anti-Patterns

- Over-provisioned "just in case" resources
- Unused EBS volumes, idle load balancers
- Data transfer between regions (pahalı)
- CloudWatch log retention unlimited
- Her environment production-grade
