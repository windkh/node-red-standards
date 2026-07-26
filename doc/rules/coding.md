# Coding rules (detail)

Rationale and detail behind the enforceable rules in `templates/AGENTS.md`.

- **Modular layout.** Keep logic in `lib/` so it is testable without a Node-RED runtime.
  `nodes/*.js` should be thin: parse `msg`, call into `lib/`, set `node.status`, send.
- **Entry file.** `<pkg>/99-<name>.js` only registers node types. No business logic.
- **ESLint flat config.** Use `eslint.config.js` with `@eslint/js` recommended + `eslint-config-prettier`.
  Warnings for style, errors for correctness (`no-empty` with `allowEmptyCatch`, etc.).
- **Prettier.** 4-space indent, single quotes, es5 trailing commas, printWidth 120.
- **Node engine.** `>=20.0.0`.
- **No `var`.** Use `const` by default and `let` only when a binding is reassigned. `var`'s
  function-scoping and hoisting are footguns that block/let never have. Enforced as an error by
  `no-var`; `prefer-const` (warn) nudges `let` → `const` where nothing reassigns it.
- **One statement per line.** Don't chain several instructions on one line (e.g. `a(); b();` or
  an assignment plus a call). One statement per line keeps diffs, stack traces, and breakpoints
  meaningful and the code scannable. Enforced by `max-statements-per-line` (max 1, warn).
- **Single exit.** Each function has exactly one `return`, as its final statement — no early or
  mid-function returns. A single exit makes the control flow and the returned value obvious at a
  glance and keeps cleanup in one place. There is no core ESLint rule for this, so it's enforced
  by code review rather than the linter.
