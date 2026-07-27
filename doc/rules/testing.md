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
- `node --test` with no args loads **every** `.js` file under `test/` (including fixtures) and runs it. The default pattern is `**/test/**/*.?(c|m)js`, so this is about the *directory*, not the filename — renaming a helper or moving it to `test/helpers/` does not exempt it.
- Because the standard targets Node >= 20, the standard test script takes **no path arguments**: glob arguments to `node --test` need Node >= 21 and fail outright on 20 (`Could not find …/test/**/*.test.js`).
- Therefore: keep non-test helpers and fixtures OUT of `test/` — e.g. `test-helpers/` at the repo root. This is the portable rule and works on every supported Node.
- Only a repo that requires Node >= 21 in its own `engines` may scope discovery instead: `node --test 'test/**/*.test.js'`.
