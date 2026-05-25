<!-- Imported from vibecosystem/skills/compliance-patterns (MIT) — https://github.com/vibeeval/vibecosystem -->

# Compliance Patterns

Data governance and regulatory compliance patterns for software systems.

## Data Classification

```typescript
// Tag every data field with its classification level
enum DataClass {
  PUBLIC = 'public',           // Marketing content, product info
  INTERNAL = 'internal',       // Business metrics, employee count
  CONFIDENTIAL = 'confidential', // Customer emails, order history
  RESTRICTED = 'restricted',   // Passwords, SSN, payment cards, health data
}

// Schema-level classification
interface UserRecord {
  id: string                    // INTERNAL
  email: string                 // CONFIDENTIAL (PII)
  displayName: string           // CONFIDENTIAL (PII)
  passwordHash: string          // RESTRICTED
  dateOfBirth: string           // RESTRICTED (sensitive PII)
  preferences: object           // INTERNAL
  createdAt: Date              // INTERNAL
}

// Field-level encryption for RESTRICTED data
const ENCRYPTED_FIELDS: Record<string, DataClass> = {
  'user.email': DataClass.CONFIDENTIAL,
  'user.dateOfBirth': DataClass.RESTRICTED,
  'user.ssn': DataClass.RESTRICTED,
  'payment.cardNumber': DataClass.RESTRICTED,
}

function shouldEncryptAtRest(fieldPath: string): boolean {
  const classification = ENCRYPTED_FIELDS[fieldPath]
  return classification === DataClass.RESTRICTED
}

function shouldMaskInLogs(fieldPath: string): boolean {
  const classification = ENCRYPTED_FIELDS[fieldPath]
  return classification === DataClass.CONFIDENTIAL || classification === DataClass.RESTRICTED
}
```

## Audit Logging

```typescript
interface AuditEvent {
  id: string
  timestamp: string         // ISO 8601
  actor: {
    id: string
    type: 'user' | 'system' | 'admin'
    ip?: string
  }
  action: string            // e.g., 'user.profile.updated', 'order.deleted'
  resource: {
    type: string
    id: string
  }
  changes?: {
    field: string
    oldValue: unknown       // Masked if RESTRICTED
    newValue: unknown       // Masked if RESTRICTED
  }[]
  metadata?: Record<string, unknown>
  result: 'success' | 'failure' | 'denied'
  reason?: string           // For denied/failure
}

class AuditLogger {
  constructor(private store: AuditStore) {}

  async log(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    const auditEvent: AuditEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      changes: event.changes?.map(c => ({
        ...c,
        oldValue: shouldMaskInLogs(c.field) ? '[REDACTED]' : c.oldValue,
        newValue: shouldMaskInLogs(c.field) ? '[REDACTED]' : c.newValue,
      })),
    }

    // Audit logs are append-only, immutable, tamper-evident
    await this.store.append(auditEvent)
  }
}

// Middleware: auto-audit all mutations
function auditMiddleware(auditLogger: AuditLogger) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res)

    res.json = function(body: any) {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        auditLogger.log({
          actor: { id: req.user?.id ?? 'anonymous', type: 'user', ip: req.ip },
          action: `${req.method.toLowerCase()}.${req.path}`,
          resource: { type: req.path.split('/')[2], id: req.params.id ?? 'N/A' },
          result: res.statusCode < 400 ? 'success' : 'failure',
        }).catch(err => console.error('Audit log failed:', err))
      }
      return originalJson(body)
    }

    next()
  }
}
```

## GDPR Data Subject Rights

```typescript
// Right to Access (Article 15): export all user data
async function exportUserData(userId: string): Promise<DataExport> {
  const user = await db.user.findUnique({ where: { id: userId } })
  const orders = await db.order.findMany({ where: { userId } })
  const activityLog = await db.activityLog.findMany({ where: { userId } })
  const consents = await db.consent.findMany({ where: { userId } })

  return {
    exportDate: new Date().toISOString(),
    subject: { id: userId, email: user?.email },
    personalData: {
      profile: sanitizeForExport(user),
      orders: orders.map(sanitizeForExport),
      activity: activityLog,
      consents,
    },
    format: 'JSON',
    version: '1.0',
  }
}

// Right to Erasure (Article 17): delete user data
async function deleteUserData(userId: string): Promise<DeletionReport> {
  const report: DeletionReport = { userId, deletedAt: new Date(), items: [] }

  // Soft-delete user profile
  await db.user.update({
    where: { id: userId },
    data: { email: `deleted_${userId}@deleted.local`, deletedAt: new Date() }
  })
  report.items.push({ type: 'user_profile', action: 'anonymized' })

  // Hard-delete activity logs
  const { count } = await db.activityLog.deleteMany({ where: { userId } })
  report.items.push({ type: 'activity_logs', action: 'deleted', count })

  // Retain orders for legal/tax compliance (anonymize PII)
  await db.order.updateMany({
    where: { userId },
    data: { customerName: '[DELETED]', customerEmail: '[DELETED]' }
  })
  report.items.push({ type: 'orders', action: 'anonymized_pii' })

  // Log the deletion itself (audit trail required)
  await auditLogger.log({
    actor: { id: userId, type: 'user' },
    action: 'user.data.erased',
    resource: { type: 'user', id: userId },
    result: 'success',
  })

  return report
}
```

## Consent Management

```typescript
interface ConsentRecord {
  userId: string
  purpose: string           // 'marketing', 'analytics', 'third_party_sharing'
  granted: boolean
  grantedAt: Date
  expiresAt?: Date
  source: string            // 'signup_form', 'settings_page', 'cookie_banner'
  version: string           // Consent text version (re-consent needed on change)
}

async function checkConsent(userId: string, purpose: string): Promise<boolean> {
  const consent = await db.consent.findFirst({
    where: {
      userId,
      purpose,
      granted: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    }
  })
  return consent !== null
}

// Guard: only process data if consent exists
async function sendMarketingEmail(userId: string): Promise<void> {
  const hasConsent = await checkConsent(userId, 'marketing')
  if (!hasConsent) {
    console.log(`Skipping marketing email for ${userId}: no consent`)
    return
  }
  await emailService.send(userId, marketingTemplate)
}
```

## Retention Policies

```typescript
// Automated data retention enforcement
const RETENTION_POLICIES: RetentionPolicy[] = [
  { dataType: 'session_logs', retentionDays: 90, action: 'delete' },
  { dataType: 'audit_logs', retentionDays: 2555, action: 'archive' },  // 7 years
  { dataType: 'user_activity', retentionDays: 365, action: 'anonymize' },
  { dataType: 'deleted_accounts', retentionDays: 30, action: 'purge' },
]

async function enforceRetention(): Promise<RetentionReport> {
  const report: RetentionReport = { executedAt: new Date(), actions: [] }

  for (const policy of RETENTION_POLICIES) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays)

    const count = await executeRetentionAction(policy.dataType, cutoffDate, policy.action)
    report.actions.push({
      dataType: policy.dataType,
      action: policy.action,
      recordsAffected: count,
      cutoffDate,
    })
  }

  return report
}

// Schedule: run daily via cron
// 0 3 * * * node scripts/enforce-retention.js
```

## Checklist

- [ ] Every data field classified (PUBLIC/INTERNAL/CONFIDENTIAL/RESTRICTED)
- [ ] RESTRICTED data encrypted at rest and in transit
- [ ] PII masked in all log outputs (never log raw email, SSN, card numbers)
- [ ] Audit log: immutable, append-only, captures who/what/when/result
- [ ] Data export endpoint (GDPR Article 15 - Right to Access)
- [ ] Data deletion/anonymization endpoint (GDPR Article 17 - Right to Erasure)
- [ ] Consent records with purpose, timestamp, version, and expiry
- [ ] Retention policies enforced automatically (daily cron)
- [ ] Data Processing Agreement (DPA) with all third-party processors

## Anti-Patterns

- Logging PII in application logs (searchable by anyone with log access)
- Hard-deleting without audit trail (no proof of compliance)
- Single "I agree" checkbox for all purposes (GDPR requires granular consent)
- Retaining data indefinitely "just in case" (violates data minimization)
- Consent version not tracked: consent invalidated when terms change
- No data inventory: unable to locate all PII for subject access requests
