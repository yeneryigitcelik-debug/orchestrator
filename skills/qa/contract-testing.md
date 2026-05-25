<!-- Imported from vibecosystem/skills/contract-testing-patterns (MIT) — https://github.com/vibeeval/vibecosystem -->

# Contract Testing Patterns

## Consumer-Driven Contract Testing with Pact

### Consumer Test (JavaScript)

```javascript
const { PactV3, MatchersV3 } = require('@pact-foundation/pact');
const { like, eachLike, string, integer } = MatchersV3;

const provider = new PactV3({
  consumer: 'OrderService',
  provider: 'UserService',
  logLevel: 'warn',
});

describe('User API Contract', () => {
  it('returns user by ID', async () => {
    await provider
      .given('user with ID 1 exists')
      .uponReceiving('a request for user 1')
      .withRequest({
        method: 'GET',
        path: '/api/users/1',
        headers: { Accept: 'application/json' },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          id: integer(1),
          name: string('Jane Doe'),
          email: string('jane@example.com'),
          roles: eachLike('admin'),
        },
      })
      .executeTest(async (mockServer) => {
        const client = new UserClient(mockServer.url);
        const user = await client.getUser(1);
        expect(user.id).toBe(1);
        expect(user.name).toBeDefined();
      });
  });
});
```

### Provider Verification

```javascript
const { Verifier } = require('@pact-foundation/pact');

describe('User Provider Verification', () => {
  it('validates consumer contracts', async () => {
    const verifier = new Verifier({
      providerBaseUrl: 'http://localhost:3000',
      pactBrokerUrl: process.env.PACT_BROKER_URL,
      pactBrokerToken: process.env.PACT_BROKER_TOKEN,
      provider: 'UserService',
      providerVersion: process.env.GIT_SHA,
      providerVersionBranch: process.env.GIT_BRANCH,
      publishVerificationResult: true,
      stateHandlers: {
        'user with ID 1 exists': async () => {
          await db.users.create({ id: 1, name: 'Jane Doe', email: 'jane@example.com' });
        },
        'no users exist': async () => {
          await db.users.deleteAll();
        },
      },
    });
    await verifier.verifyProvider();
  });
});
```

### Schema Evolution Rules

```yaml
# Backward Compatible (SAFE):
- Adding optional fields
- Adding new endpoints
- Widening accepted value ranges
- Adding new enum values (if consumer ignores unknown)

# Breaking Changes (UNSAFE):
- Removing fields
- Renaming fields
- Changing field types
- Making optional fields required
- Narrowing accepted value ranges
- Removing endpoints
```

### Can-I-Deploy Check

```bash
# Before deploying consumer
pact-broker can-i-deploy \
  --pacticipant OrderService \
  --version $GIT_SHA \
  --to-environment production

# Before deploying provider
pact-broker can-i-deploy \
  --pacticipant UserService \
  --version $GIT_SHA \
  --to-environment production
```

## Checklist

- [ ] Every external API dependency has a consumer contract
- [ ] Provider state handlers seed realistic test data
- [ ] Contracts published to Pact Broker with git SHA version
- [ ] `can-i-deploy` gate in CI pipeline before deploy
- [ ] Provider verification runs on every PR
- [ ] Breaking change detection automated
- [ ] Contract tests run in under 30 seconds
- [ ] Webhook configured to trigger provider verification on new pact

## Anti-Patterns

- Testing provider internal logic in consumer tests
- Using exact matchers instead of type matchers (brittle)
- Skipping provider states (tests pass but don't reflect reality)
- Not versioning contracts with git SHA
- Running contract tests against shared environments
- Coupling consumer tests to provider implementation details
- Ignoring `can-i-deploy` failures
