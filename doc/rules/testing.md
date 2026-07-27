# Testing rules (detail)

- **Runner.** Node's built-in test runner (`node --test`, Node >= 20). No mocha, no external runner.
- **Helper.** `node-red-node-test-helper` for node wiring; unit-test `lib/` logic directly.
- **Imports.** `const { describe, it, before, after } = require('node:test');` and assert with `node:assert`.
  (No injected globals — import what you use.)
- **Location.** `test/`, files named `*.test.js`.
- **Coverage.** `c8` (mature, V8-based) with thresholds in `package.json`; `coverage:check` runs in CI.
  The built-in `--experimental-test-coverage` is intentionally not used while it is still experimental.
- **Flaky integration tests.** `node --test` has no retry; keep helper-based tests deterministic
  (fixed ports off, await teardown) rather than relying on retries.

## Fixtures / helpers
- `node --test` with no args loads **every** `.js` file under `test/` (including fixtures) and runs it.
- Therefore the standard test script scopes discovery: `node --test 'test/**/*.test.js'` (Node >= 21). Fixtures/helpers that are not `*.test.js` are then ignored.
- On Node 20 (no glob support in `--test`), keep non-test helpers OUT of `test/` (e.g. `test-fixtures/`).
