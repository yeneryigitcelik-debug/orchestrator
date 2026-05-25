<!-- Imported from vibecosystem/skills/mutation-testing (MIT) — https://github.com/vibeeval/vibecosystem -->

# Mutation Testing

## Nedir?

Mutation testing, test suite'inin kalitesini olcen bir tekniktir. Kaynak kodda kucuk degisiklikler (mutasyonlar) yapilir ve testlerin bu degisiklikleri yakalayip yakalamadigina bakilir.

- **Mutant**: Kaynak kodda yapilan kucuk degisiklik
- **Killed**: Test suite mutant'i yakaladi (test fail etti)
- **Survived**: Test suite mutant'i yakalayamadi (testler hala geciyor)
- **Kill Ratio**: Killed / Total mutants (yuzde olarak)

Code coverage "kodun ne kadari calistiriliyor?" sorusunu yanitlar.
Mutation testing "testler gercekten bir seyi kontrol ediyor mu?" sorusunu yanitlar.

%100 code coverage'a sahip ama assertion'i olmayan testler mutation testing'de FAIL alir.

## Tool Setup

### Stryker (JavaScript / TypeScript)

```bash
# Install
npm install --save-dev @stryker-mutator/core
npx stryker init

# Jest runner
npm install --save-dev @stryker-mutator/jest-runner

# Vitest runner
npm install --save-dev @stryker-mutator/vitest-runner

# TypeScript support
npm install --save-dev @stryker-mutator/typescript-checker
```

Config (`stryker.config.mjs`):
```javascript
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  mutate: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  testRunner: 'jest',
  checkers: ['typescript'],
  reporters: ['html', 'clear-text', 'progress', 'json'],
  coverageAnalysis: 'perTest',
  thresholds: {
    high: 80,
    low: 60,
    break: null  // Set to 60 to fail CI on low kill ratio
  },
  timeoutMS: 60000,
  concurrency: 4
};
```

Run:
```bash
npx stryker run
# Report: reports/mutation/mutation.html
```

### mutmut (Python)

```bash
pip install mutmut
```

Config (`pyproject.toml`):
```toml
[tool.mutmut]
paths_to_mutate = "src/"
tests_dir = "tests/"
runner = "python -m pytest -x --tb=short -q"
dict_synonyms = "Struct,NamedStruct"
```

Run:
```bash
# Full run
mutmut run

# Results
mutmut results

# Show specific mutant
mutmut show 42

# HTML report
mutmut html
```

### go-mutesting (Go)

```bash
go install github.com/zimmski/go-mutesting/cmd/go-mutesting@latest
```

Run:
```bash
# Full run
go-mutesting ./...

# Specific package
go-mutesting ./pkg/calculator/...

# With score threshold
go-mutesting --score 0.8 ./...
```

## Mutation Operatorleri

### Arithmetic Mutations
```
a + b  ->  a - b, a * b, a / b
a * b  ->  a / b, a + b
a++    ->  a--
```
Neyi test eder: Matematiksel hesaplamalarin dogrulugu

### Conditional Boundary Mutations
```
a > b   ->  a >= b
a < b   ->  a <= b
a >= b  ->  a > b
a <= b  ->  a < b
```
Neyi test eder: Boundary condition'lar, off-by-one hatalari

### Boolean Mutations
```
true    ->  false
a && b  ->  a || b
a || b  ->  a && b
!a      ->  a
```
Neyi test eder: Boolean logic, branch coverage

### Negation Mutations
```
if (condition)   ->  if (!condition)
while (x > 0)    ->  while (x <= 0)
```
Neyi test eder: Kontrol akisinin dogrulugu

### Return Value Mutations
```
return x       ->  return 0
return true    ->  return false
return "hello" ->  return ""
return obj     ->  return null
```
Neyi test eder: Return value assertion'lari

### String Mutations
```
"hello"  ->  ""
"hello"  ->  "Stryker was here!"
```
Neyi test eder: String handling, empty string kontrolu

### Statement Removal
```
doSomething();  ->  (removed)
x = calculate() ->  (removed)
```
Neyi test eder: Side effect'lerin test edilip edilmedigi

## Kill Ratio Hedefleri

| Seviye | Kill Ratio | Anlami |
|--------|-----------|--------|
| Mukemmel | 90%+ | Test suite cok guclu |
| Iyi | 80-89% | Kabul edilebilir, kucuk iyilestirmeler |
| Orta | 60-79% | Ciddi iyilestirme gerekli |
| Zayif | < 60% | Test suite guvenilemez |

Hedef: Her projede minimum %80 kill ratio

## Survived Mutant Analizi

Bir mutant survive ettiyse su adimlari takip et:

### 1. Mutant'i Anla
```
Dosya: src/calculator.ts:15
Original:  if (balance > 0) { ... }
Mutant:    if (balance >= 0) { ... }
Durum:     SURVIVED
```

### 2. Neden Survive Etti?
- Hicbir test `balance === 0` durumunu test etmiyor
- Boundary condition icin test eksik

### 3. Test Yaz
```typescript
it('should handle zero balance', () => {
  const result = processBalance(0);
  expect(result).toBe('no_funds'); // Bu test mutant'i oldurur
});
```

### 4. Tekrar Calistir
```bash
npx stryker run --mutate "src/calculator.ts"
```

## Test Iyilestirme Pattern'leri

### Pattern 1: Boundary Testing
Survived mutant `>` -> `>=` ise:
```typescript
// Her boundary icin 3 test yaz: altinda, ustunde, tam sinirda
it('rejects when below minimum', () => expect(validate(-1)).toBe(false));
it('rejects at exact minimum', () => expect(validate(0)).toBe(false));
it('accepts above minimum', () => expect(validate(1)).toBe(true));
```

### Pattern 2: Return Value Assertion
Survived mutant `return x` -> `return 0` ise:
```typescript
// Testlerde return value'yu MUTLAKA assert et
const result = calculate(5, 3);
expect(result).toBe(8); // Spesifik deger kontrolu
```

### Pattern 3: Boolean Logic
Survived mutant `&&` -> `||` ise:
```typescript
// Her boolean kombinasyonu test et
it('fails when only A is true', () => expect(check(true, false)).toBe(false));
it('fails when only B is true', () => expect(check(false, true)).toBe(false));
it('passes when both are true', () => expect(check(true, true)).toBe(true));
it('fails when both are false', () => expect(check(false, false)).toBe(false));
```

### Pattern 4: Side Effect Testing
Survived mutant statement removal ise:
```typescript
// Side effect'leri de test et
calculate(5);
expect(mockLogger.info).toHaveBeenCalledWith('Calculated: 5');
expect(mockMetrics.increment).toHaveBeenCalledWith('calculations');
```

### Pattern 5: Negation Testing
Survived mutant `!x` -> `x` ise:
```typescript
// Her iki yolu da test et
it('handles truthy input', () => expect(process(true)).toBe('A'));
it('handles falsy input', () => expect(process(false)).toBe('B'));
```

## CI/CD Entegrasyonu

### GitHub Actions

```yaml
name: Mutation Testing
on:
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * 0'  # Haftalik tam tarama

jobs:
  mutation-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx stryker run
      - uses: actions/upload-artifact@v4
        with:
          name: mutation-report
          path: reports/mutation/
      - name: Check kill ratio
        run: |
          SCORE=$(cat reports/mutation/mutation.json | jq '.schemaVersion' -r)
          # Custom threshold check script
```

### GitLab CI

```yaml
mutation-test:
  stage: test
  script:
    - npm ci
    - npx stryker run
  artifacts:
    paths:
      - reports/mutation/
    expire_in: 7 days
  only:
    - merge_requests
  allow_failure: true  # Ilk baslarken, sonra kaldir
```

### Incremental CI (PR'larda)

PR'larda sadece degisen dosyalari mutate et:

```yaml
- name: Get changed files
  id: changed
  run: |
    FILES=$(git diff --name-only origin/main...HEAD -- '*.ts' | grep -v test | tr '\n' ',')
    echo "files=$FILES" >> $GITHUB_OUTPUT
- name: Run incremental mutation
  if: steps.changed.outputs.files != ''
  run: npx stryker run --mutate "${{ steps.changed.outputs.files }}"
```

## Performance Optimization

### 1. Incremental Mutation Testing
Sadece degisen dosyalari mutate et:
```bash
# Stryker
npx stryker run --mutate "src/changed-file.ts"

# mutmut
mutmut run --paths-to-mutate src/changed_module/
```

### 2. Per-Test Coverage Analysis
Stryker'da `coverageAnalysis: 'perTest'` kullan. Her mutant sadece ilgili testlerle calistirilir.

### 3. Timeout Ayari
Sonsuz donguye giren mutant'lar icin makul timeout:
```javascript
timeoutMS: 60000,     // 60 saniye max
timeoutFactor: 1.5    // Normal surenin 1.5 kati
```

### 4. Concurrency
CPU sayisina gore paralel calistir:
```javascript
concurrency: 4  // veya os.cpus().length - 1
```

### 5. Incremental Mode (Stryker)
Onceki sonuclari cache'le:
```javascript
incremental: true,
incrementalFile: 'reports/stryker-incremental.json'
```

## Common Pitfalls

### 1. Equivalent Mutants
Bazi mutasyonlar kodun davranisini degistirmez:
```typescript
// Original
const i = 0;

// Mutant (equivalent - davranis ayni)
const i = -0;
```
Cozum: Equivalent mutant'lari rapordan cikar, survived olarak sayma.

### 2. Infinite Loop Mutants
`while (true)` veya `for(;;)` gibi durumlar:
Cozum: Timeout ayarini dogru yap, timeout mutant'larini "killed" say.

### 3. Cok Uzun Calisma Suresi
Buyuk codebase'lerde saatlerce surebilir:
Cozum: Incremental mode, per-test coverage, parallelism kullan.

### 4. Test Isolation Sorunlari
Mutant, baska testleri de etkiler:
Cozum: Testlerin bagimsiz oldugunu dogrula, shared state kullanma.

### 5. Flaky Test False Positives
Flaky testler mutant'lari yanlis killed gosterebilir:
Cozum: Once flaky testleri duzelt, sonra mutation test calistir.

### 6. Config Dosyalari / Constants
Config dosyalarini mutate etmenin anlami yok:
Cozum: `mutate` pattern'indan config, constants, types dosyalarini haric tut.

## Triggers

Bu skill su durumlarda aktive olur:
- "mutation test" dendiginde
- "test quality" soruldugunda
- "test effectiveness" degerlendirmesi istendiginde
- "kill ratio" soruldugunda
- "survived mutant" analizi gerektiginde
- Test suite guvenirligi sorgulandiginda
