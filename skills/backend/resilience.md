<!-- Imported from vibecosystem/skills/resilience-patterns (MIT) — https://github.com/vibeeval/vibecosystem -->

# Resilience Patterns

Production-grade patterns for surviving failures without cascading.

## Circuit Breaker

```typescript
// States: CLOSED (normal) → OPEN (blocking) → HALF_OPEN (testing)
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

class CircuitBreaker {
  private state: CircuitState = 'CLOSED'
  private failureCount = 0
  private lastFailureTime = 0
  private successCount = 0

  constructor(
    private readonly failureThreshold = 5,
    private readonly recoveryTimeout = 30_000,  // ms
    private readonly halfOpenMaxCalls = 3
  ) {}

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN'
        this.successCount = 0
      } else {
        throw new Error('Circuit breaker is OPEN — request rejected')
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (err) {
      this.onFailure()
      throw err
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++
      if (this.successCount >= this.halfOpenMaxCalls) {
        this.state = 'CLOSED'
        this.failureCount = 0
      }
    } else {
      this.failureCount = 0
    }
  }

  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN'
    }
  }

  getState(): CircuitState { return this.state }
}

// Usage with Opossum (production library)
// import CircuitBreaker from 'opossum'
// const breaker = new CircuitBreaker(riskyCall, { timeout: 3000, errorThresholdPercentage: 50 })
const paymentBreaker = new CircuitBreaker(5, 30_000)

async function chargeUser(userId: string, amount: number) {
  return paymentBreaker.call(() => paymentService.charge(userId, amount))
}
```

## Retry with Exponential Backoff + Jitter

```typescript
interface RetryOptions {
  maxAttempts?: number
  baseDelayMs?: number
  maxDelayMs?: number
  jitter?: boolean
  retryIf?: (error: unknown) => boolean
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 500,
    maxDelayMs = 15_000,
    jitter = true,
    retryIf = () => true
  } = options

  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err

      if (attempt === maxAttempts || !retryIf(err)) throw err

      // Exponential backoff: 500ms, 1s, 2s, 4s...
      const base = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs)
      // Full jitter: random between 0 and base (avoids synchronized retries)
      const delay = jitter ? Math.random() * base : base

      console.warn(`Attempt ${attempt}/${maxAttempts} failed, retrying in ${Math.round(delay)}ms`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

// Usage: only retry transient errors
await withRetry(
  () => externalApi.fetchData(),
  {
    maxAttempts: 4,
    retryIf: (err) => err instanceof NetworkError || (err as any)?.status >= 500
  }
)
```

## Bulkhead Pattern

```typescript
// Isolate failure domains: separate thread pools / queues per service
class Bulkhead {
  private activeCount = 0
  private queue: Array<() => void> = []

  constructor(
    private maxConcurrent: number,
    private maxQueueSize: number = 50
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.activeCount >= this.maxConcurrent) {
      if (this.queue.length >= this.maxQueueSize) {
        throw new Error('Bulkhead queue full — request rejected')
      }
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('Bulkhead queue timeout')),
          5000
        )
        this.queue.push(() => { clearTimeout(timeout); resolve() })
      })
    }

    this.activeCount++
    try {
      return await fn()
    } finally {
      this.activeCount--
      if (this.queue.length > 0) {
        const next = this.queue.shift()!
        next()
      }
    }
  }

  getStats() {
    return { activeCount: this.activeCount, queueLength: this.queue.length }
  }
}

// Separate bulkheads per downstream service
const paymentBulkhead = new Bulkhead(10, 20)
const emailBulkhead = new Bulkhead(5, 10)
const dbBulkhead = new Bulkhead(30, 100)
```

## Timeout Policies

```typescript
// Never let a call hang indefinitely
function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  label = 'operation'
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    )
  ])
}

// Connect timeout vs read timeout (different values)
const fetchWithTimeouts = async (url: string) => {
  const controller = new AbortController()
  const connectTimeout = setTimeout(() => controller.abort(), 2000)  // connect: 2s

  try {
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(connectTimeout)

    // Read timeout: 10s for body streaming
    return await withTimeout(() => response.json(), 10_000, 'response body read')
  } finally {
    clearTimeout(connectTimeout)
  }
}
```

## Fallback Chain

```typescript
async function getMarketData(id: string): Promise<Market> {
  return withFallbacks([
    { name: 'primary-db',   fn: () => primaryDb.market.findUnique({ where: { id } }) },
    { name: 'redis-cache',  fn: () => redis.get(`market:${id}`).then(v => v ? JSON.parse(v) : null) },
    { name: 'replica-db',   fn: () => replicaDb.market.findUnique({ where: { id } }) },
    { name: 'stale-cache',  fn: () => staleCache.get(id) }
  ])
}

async function withFallbacks<T>(
  strategies: Array<{ name: string; fn: () => Promise<T | null> }>
): Promise<T> {
  for (const { name, fn } of strategies) {
    try {
      const result = await fn()
      if (result != null) return result
    } catch (err) {
      console.warn(`Strategy '${name}' failed:`, (err as Error).message)
    }
  }
  throw new Error('All fallback strategies exhausted')
}
```

## Health Check Endpoints

```typescript
import express from 'express'

const app = express()

// Liveness: is the process alive? (k8s restarts if fails)
app.get('/live', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Readiness: is the app ready to serve traffic? (k8s removes from LB if fails)
app.get('/ready', async (_req, res) => {
  const checks = await Promise.allSettled([
    checkDatabase(),
    checkRedis(),
    checkDependencies()
  ])

  const results = checks.map((c, i) => ({
    name: ['database', 'redis', 'dependencies'][i],
    status: c.status === 'fulfilled' ? 'ok' : 'fail',
    error: c.status === 'rejected' ? (c.reason as Error).message : undefined
  }))

  const allHealthy = results.every(r => r.status === 'ok')
  res.status(allHealthy ? 200 : 503).json({ status: allHealthy ? 'ready' : 'not-ready', checks: results })
})

// Health: detailed diagnostics for ops team
app.get('/health', async (_req, res) => {
  const [dbMs, redisMs] = await Promise.all([pingDb(), pingRedis()])
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    db: { latencyMs: dbMs },
    redis: { latencyMs: redisMs }
  })
})

async function checkDatabase(): Promise<void> {
  await db.$queryRaw`SELECT 1`
}

async function checkRedis(): Promise<void> {
  const pong = await redis.ping()
  if (pong !== 'PONG') throw new Error('Redis ping failed')
}
```

## Graceful Shutdown

```typescript
// Handle SIGTERM (k8s, Docker stop) without dropping in-flight requests
let isShuttingDown = false

async function gracefulShutdown(server: http.Server): Promise<void> {
  console.log('SIGTERM received, starting graceful shutdown...')
  isShuttingDown = true

  // Stop accepting new requests
  server.close(async () => {
    console.log('HTTP server closed')

    try {
      // Drain active jobs
      await jobQueue.close()

      // Close DB connections
      await db.$disconnect()

      // Close Redis
      await redis.quit()

      console.log('Graceful shutdown complete')
      process.exit(0)
    } catch (err) {
      console.error('Error during shutdown:', err)
      process.exit(1)
    }
  })

  // Force kill after 30s if drain stalls
  setTimeout(() => {
    console.error('Graceful shutdown timed out, forcing exit')
    process.exit(1)
  }, 30_000)
}

// Reject new requests during shutdown
app.use((_req, res, next) => {
  if (isShuttingDown) {
    res.setHeader('Connection', 'close')
    return res.status(503).json({ error: 'Server is shutting down' })
  }
  next()
})

process.on('SIGTERM', () => gracefulShutdown(server))
process.on('SIGINT', () => gracefulShutdown(server))
```

## Idempotency Keys

```typescript
// Safe to retry without double-charging / double-creating
async function processPaymentIdempotent(
  idempotencyKey: string,
  payload: PaymentPayload
): Promise<PaymentResult> {
  const lockKey = `idempotency:${idempotencyKey}`

  // Check if already processed
  const existing = await redis.get(lockKey)
  if (existing) {
    return JSON.parse(existing) as PaymentResult
  }

  const result = await paymentGateway.charge(payload)

  // Store result for 24 hours
  await redis.setex(lockKey, 86_400, JSON.stringify(result))

  return result
}

// Client sends Idempotency-Key header, retry safe
router.post('/payments', async (req, res) => {
  const key = req.headers['idempotency-key'] as string
  if (!key) return res.status(400).json({ error: 'Idempotency-Key header required' })

  const result = await processPaymentIdempotent(key, req.body)
  res.json({ success: true, data: result })
})
```

**Remember**: Resilience is composed — combine circuit breaker + retry + bulkhead + timeout for defense in depth. Never apply retry without a circuit breaker, or you'll amplify load on a failing service.
