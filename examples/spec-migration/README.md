# Spec migration: mocha + chai → node:test + node:assert

Side-by-side example from the real ntrip `nmea-decoder` spec.
`*.spec.mocha.js` is the original; `*.test.js` is the target. Only imports and assertions change —
the `node-red-node-test-helper` usage and test structure stay identical.

## Import changes
| mocha / chai | node:test |
|---|---|
| (globals `describe`/`it`/`before`…) | `const { describe, it, before, after, afterEach } = require('node:test');` |
| `const { expect } = require('chai');` | `const assert = require('node:assert');` |

## Assertion mapping (chai `expect` → `node:assert`)
| chai | node:assert |
|---|---|
| `expect(a).to.equal(b)` | `assert.strictEqual(a, b)` |
| `expect(a).to.not.equal(b)` | `assert.notStrictEqual(a, b)` |
| `expect(a).to.deep.equal(b)` | `assert.deepStrictEqual(a, b)` |
| `expect(a).to.be.true` / `.false` | `assert.strictEqual(a, true)` / `false` |
| `expect(a).to.be.a('string')` | `assert.strictEqual(typeof a, 'string')` |
| `expect(a).to.have.property('p')` | `assert.ok(Object.prototype.hasOwnProperty.call(a, 'p'))` |
| `expect(a).to.have.lengthOf(n)` | `assert.strictEqual(a.length, n)` |
| `expect(fn).to.throw()` | `assert.throws(fn)` |

The `nrstd migrate-tests` command applies these automatically (best-effort) and flags anything it
cannot map with a `TODO(migrate-tests)` comment for manual review.
