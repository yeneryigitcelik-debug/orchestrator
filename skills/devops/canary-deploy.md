<!-- Imported from vibecosystem/skills/canary-deploy-patterns (MIT) — https://github.com/vibeeval/vibecosystem -->

# Canary Deploy Patterns

Progressive delivery patterns for safe, automated production deployments.

## Traffic Splitting Strategy

```yaml
# Istio VirtualService: gradual traffic shift
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-canary
spec:
  hosts:
    - api.example.com
  http:
    - route:
        - destination:
            host: api-stable
            port:
              number: 80
          weight: 95          # 95% to stable version
        - destination:
            host: api-canary
            port:
              number: 80
          weight: 5           # 5% to canary version

---
# Progressive rollout schedule
# Step 1:  5% canary, observe 10 minutes
# Step 2: 25% canary, observe 10 minutes
# Step 3: 50% canary, observe 10 minutes
# Step 4: 75% canary, observe 10 minutes
# Step 5: 100% canary → promote to stable
```

## Argo Rollouts Canary

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: api-server
spec:
  replicas: 10
  strategy:
    canary:
      canaryService: api-canary-svc
      stableService: api-stable-svc
      trafficRouting:
        istio:
          virtualService:
            name: api-vsvc
      steps:
        # Step 1: 5% traffic to canary
        - setWeight: 5
        - pause: { duration: 10m }

        # Step 2: Run analysis (automated health check)
        - analysis:
            templates:
              - templateName: canary-success-rate
            args:
              - name: service-name
                value: api-canary-svc

        # Step 3: Increase to 25%
        - setWeight: 25
        - pause: { duration: 10m }

        # Step 4: Another analysis gate
        - analysis:
            templates:
              - templateName: canary-success-rate
              - templateName: canary-latency

        # Step 5: Increase to 50%
        - setWeight: 50
        - pause: { duration: 15m }

        # Step 6: Final analysis before full promotion
        - analysis:
            templates:
              - templateName: canary-success-rate
              - templateName: canary-latency
              - templateName: canary-error-rate

        # Step 7: Full rollout
        - setWeight: 100

      # Auto-rollback on analysis failure
      rollbackWindow:
        revisions: 2

---
# Analysis template: success rate must stay above 99%
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: canary-success-rate
spec:
  metrics:
    - name: success-rate
      interval: 60s
      count: 5
      successCondition: result[0] >= 0.99
      failureLimit: 2
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            sum(rate(http_requests_total{
              service="{{args.service-name}}",
              status=~"2.."
            }[2m]))
            /
            sum(rate(http_requests_total{
              service="{{args.service-name}}"
            }[2m]))
```

## Health Check Design

```typescript
// Multi-level health checks for canary validation
interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  checks: Record<string, {
    status: 'pass' | 'fail'
    latencyMs: number
    message?: string
  }>
  version: string
  uptime: number
}

async function deepHealthCheck(): Promise<HealthCheckResult> {
  const checks: HealthCheckResult['checks'] = {}

  // Database connectivity
  const dbStart = Date.now()
  try {
    await db.$queryRaw`SELECT 1`
    checks.database = { status: 'pass', latencyMs: Date.now() - dbStart }
  } catch (err) {
    checks.database = {
      status: 'fail',
      latencyMs: Date.now() - dbStart,
      message: (err as Error).message
    }
  }

  // Redis connectivity
  const redisStart = Date.now()
  try {
    await redis.ping()
    checks.redis = { status: 'pass', latencyMs: Date.now() - redisStart }
  } catch (err) {
    checks.redis = {
      status: 'fail',
      latencyMs: Date.now() - redisStart,
      message: (err as Error).message
    }
  }

  // Downstream service
  const apiStart = Date.now()
  try {
    const res = await fetch('http://payment-service/health', { signal: AbortSignal.timeout(3000) })
    checks.paymentService = {
      status: res.ok ? 'pass' : 'fail',
      latencyMs: Date.now() - apiStart,
    }
  } catch (err) {
    checks.paymentService = {
      status: 'fail',
      latencyMs: Date.now() - apiStart,
      message: (err as Error).message
    }
  }

  const allPassing = Object.values(checks).every(c => c.status === 'pass')
  const anyFailing = Object.values(checks).some(c => c.status === 'fail')

  return {
    status: allPassing ? 'healthy' : anyFailing ? 'unhealthy' : 'degraded',
    checks,
    version: process.env.APP_VERSION ?? 'unknown',
    uptime: process.uptime(),
  }
}
```

## Automated Rollback

```typescript
// Canary controller: monitor metrics and auto-rollback
interface CanaryConfig {
  maxErrorRate: number        // e.g., 0.02 (2%)
  maxP95LatencyMs: number     // e.g., 500
  minSuccessRate: number      // e.g., 0.99
  evaluationIntervalMs: number // e.g., 60000 (1 minute)
  warmupPeriodMs: number      // e.g., 120000 (2 minutes, ignore initial spike)
}

class CanaryController {
  private startTime: number = Date.now()

  constructor(
    private config: CanaryConfig,
    private metrics: MetricsClient,
    private deployer: DeployClient,
  ) {}

  async evaluate(): Promise<'continue' | 'promote' | 'rollback'> {
    // Skip evaluation during warmup
    if (Date.now() - this.startTime < this.config.warmupPeriodMs) {
      return 'continue'
    }

    const [errorRate, p95Latency, successRate] = await Promise.all([
      this.metrics.getErrorRate('canary', '5m'),
      this.metrics.getP95Latency('canary', '5m'),
      this.metrics.getSuccessRate('canary', '5m'),
    ])

    // Automatic rollback conditions
    if (errorRate > this.config.maxErrorRate) {
      console.error(`Canary rollback: error rate ${errorRate} > ${this.config.maxErrorRate}`)
      await this.deployer.rollback()
      return 'rollback'
    }

    if (p95Latency > this.config.maxP95LatencyMs) {
      console.error(`Canary rollback: p95 latency ${p95Latency}ms > ${this.config.maxP95LatencyMs}ms`)
      await this.deployer.rollback()
      return 'rollback'
    }

    if (successRate < this.config.minSuccessRate) {
      console.error(`Canary rollback: success rate ${successRate} < ${this.config.minSuccessRate}`)
      await this.deployer.rollback()
      return 'rollback'
    }

    return 'continue'
  }
}
```

## CI/CD Integration

```yaml
# GitHub Actions: canary deploy pipeline
name: Canary Deploy
on:
  push:
    branches: [main]

jobs:
  deploy-canary:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build and push image
        run: |
          docker build -t myapp:${{ github.sha }} .
          docker push myregistry/myapp:${{ github.sha }}

      - name: Deploy canary (5%)
        run: |
          kubectl argo rollouts set image api-server \
            api=myregistry/myapp:${{ github.sha }}

      - name: Wait for canary analysis
        run: |
          kubectl argo rollouts status api-server \
            --watch \
            --timeout 30m

      - name: Promote or rollback
        if: success()
        run: |
          kubectl argo rollouts promote api-server

      - name: Rollback on failure
        if: failure()
        run: |
          kubectl argo rollouts abort api-server
          kubectl argo rollouts undo api-server

      - name: Notify on rollback
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Canary deploy ROLLED BACK for ${{ github.sha }}"
            }
```

## Deployment Comparison Table

```
Strategy        | Risk    | Speed   | Complexity | Use When
----------------|---------|---------|------------|---------------------------
Rolling Update  | Medium  | Fast    | Low        | Non-critical services
Blue/Green      | Low     | Instant | Medium     | Stateless services, instant rollback needed
Canary          | Low     | Slow    | High       | Critical services, need metric validation
Shadow/Dark     | None    | N/A     | High       | Testing with production traffic (no user impact)
Feature Flag    | Low     | Instant | Medium     | Decoupling deploy from release
```

## Checklist

- [ ] Canary starts at 5% or less of total traffic
- [ ] Minimum 10 minutes observation per traffic increase step
- [ ] Automated analysis gates between each step (error rate, latency, success rate)
- [ ] Warmup period (2-5 min) before first evaluation (ignore cold-start metrics)
- [ ] Auto-rollback on metric threshold breach (no manual approval needed)
- [ ] Health checks include downstream dependencies (DB, cache, services)
- [ ] Rollback completes in under 60 seconds
- [ ] Slack/PagerDuty notification on rollback
- [ ] Canary uses same production database and config (not staging)
- [ ] Compare canary metrics against stable baseline (not absolute thresholds)

## Anti-Patterns

- Canary without automated analysis: manual watching is error-prone and slow
- Too fast promotion: 1-minute windows miss slow-burn issues (memory leaks)
- Only checking error rate: latency degradation goes undetected
- Canary on different infrastructure than production: results not representative
- No warmup period: JIT compilation and cache cold-start cause false alarms
- Rollback requires manual approval: defeats the purpose of automated safety
