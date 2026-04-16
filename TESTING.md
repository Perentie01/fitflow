# Testing — FitFlow Tracker

Tests in this project are designed for AI-first workflows: written, run, and interpreted by coding agents (Claude Code, Cursor, etc.) as the primary development loop.

## Commands

```bash
pnpm test          # run all tests once
pnpm test:watch    # re-run on file changes
pnpm check         # lint + build + test — run before pushing
```

## Project Structure

```
src/lib/workoutUtils.ts          # pure utilities (parsing, validation, grouping)
src/lib/workoutUtils.test.ts     # ← tests co-located next to source
src/test/setup.ts                # test environment setup
vite.config.js                   # vitest config lives in the `test` block
```

Tests are co-located with source files (`foo.ts` → `foo.test.ts`). An agent editing a file sees the test file right next to it.

## AI-First Testing Rules

These rules exist so AI agents can self-correct in a tight edit-test loop without human intervention.

### 1. Tests are the spec, not documentation

An agent modifying `parseDelimited` doesn't read prose — it runs `pnpm test` and checks which assertions broke. Write tests before or alongside features so agents always have a contract to verify against.

### 2. One behavior per test, descriptive names

Agents parse failure output to locate and fix issues. The test name must say exactly what broke.

```ts
// Bad — agent can't tell what failed
it('parses correctly', () => { /* 12 assertions */ });

// Good — agent reads the name, knows the contract
it('auto-detects tab delimiter from first line', () => { ... });
it('defaults sets to 1 when value is not a number', () => { ... });
it('returns undefined for weight when input is empty string', () => { ... });
```

### 3. Deterministic — no flakes

Flaky tests cause infinite agent retry loops. Every test must produce the same result every run:
- No `Date.now()`, `Math.random()`, or real timers — inject or mock them.
- No shared mutable state between tests.
- No dependency on test execution order.

### 4. Fast — full suite under 5 seconds

Agents run tests after every edit. Current suite: 24 tests in ~900ms. Keep it there.

### 5. Self-diagnosing failures

Use specific matchers and inline comments so the failure message alone is enough to fix the bug.

```ts
// Failure says: "expected length 5, received 4"... 5 what?
expect(errors.length).toBe(5);

// Failure says: "expected length 5, received 4" + comment explains the contract
expect(errors).toHaveLength(5); // one per required field: block_id, day, exercise_name, category, type
```

### 6. No snapshots

Agents blindly `--update` snapshot diffs without understanding whether the change is correct. Assert on specific behavior instead.

### 7. Boundary tests over exhaustive tests

Agents handle happy paths fine. Regressions come from edges:
- Empty input / missing fields
- Type coercion boundaries (string `"0"` vs number `0` vs empty `""`)
- Delimiter ambiguity (tabs vs commas)
- Off-by-one in row/set indexing

### 8. One regression test per bug fix

Every bug fix must include a test that fails without the fix and passes with it. This prevents agents from reintroducing the same bug during future refactors.

## Adding Tests for New Code

**Pure functions** — highest value, lowest effort. If it takes input and returns output with no side effects, test it. See `workoutUtils.test.ts` for the pattern.

**Components** — smoke-test that they render without crashing. Don't test Radix UI internals or visual styling.

```tsx
import { render, screen } from '@testing-library/react';

it('renders the exercise name', () => {
  render(<WorkoutCard workout={mockWorkout} />);
  expect(screen.getByText('Squats')).toBeInTheDocument();
});
```

**Database code** — mock Dexie at the module level:

```ts
vi.mock('./database', () => ({
  db: {
    workouts: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
    },
  },
}));
```

## CLAUDE.md Integration

Add this to your project's `CLAUDE.md`:

```markdown
## Testing
- Run `pnpm check` before pushing (lint + build + test).
- Run `pnpm test` after modifying any utility function.
- When modifying a function, update its co-located `.test.ts` file.
- When fixing a bug, add a regression test that fails without the fix.
- Never use snapshot tests.
```

## CI

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm check
```
