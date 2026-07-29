# Coding rules (detail)

Rationale and detail behind the enforceable rules in `templates/AGENTS.md`.

- **Modular layout.** Keep logic in `lib/` so it is testable without a Node-RED runtime.
  `nodes/*.js` should be thin: parse `msg`, call into `lib/`, set `node.status`, send.
- **Entry file.** `<pkg>/99-<name>.js` only registers node types. No business logic.
- **ESLint flat config.** Use `eslint.config.js` with `@eslint/js` recommended + `eslint-config-prettier`.
  Warnings for style, errors for correctness (`no-empty` with `allowEmptyCatch`, etc.).
- **ESLint >= 10, and `eslint` / `@eslint/js` on the same major.** `@eslint/js@10` declares a peer on
  `eslint@^10`, so bumping only `@eslint/js` fails to install; bumping only `eslint` installs fine but
  keeps the v9 recommended set, because that set comes from `@eslint/js`. The two therefore have to
  move in one commit — split across two dependabot PRs they can each pass CI while the pair is red.
  Note ESLint 10 itself needs Node `^20.19.0 || ^22.13.0 || >=24`, stricter than the `>=20.0.0` a
  package must support at runtime; it is a devDependency, so this binds contributors, not consumers.
- **Two rules arrive with ESLint 10's recommended set**, both as errors:
    - `no-unassigned-vars` — a binding that is read but never assigned is always `undefined`. The
      common source is declaring `let data; let params;` purely to pass `undefined` into a call that
      takes optional arguments. Pass the argument, or leave it out.
    - `no-useless-assignment` — a value no later statement reads. Usually a leftover from a refactor.
- **Prettier.** 4-space indent, single quotes, es5 trailing commas, printWidth 120.
- **Node engine.** `>=20.0.0`.
- **No `var`.** Use `const` by default and `let` only when a binding is reassigned. `var`'s
  function-scoping and hoisting are footguns that block/let never have. Enforced as an error by
  `no-var`; `prefer-const` (warn) nudges `let` → `const` where nothing reassigns it.
- **One statement per line.** Don't chain several instructions on one line (e.g. `a(); b();` or
  an assignment plus a call). One statement per line keeps diffs, stack traces, and breakpoints
  meaningful and the code scannable. Enforced by `max-statements-per-line` (max 1, warn).
- **Short functions, one exit.** Five rules that work together; there is no core ESLint rule for any
  of them, so they are enforced by code review.
    - **One exit per function.** A function leaves in exactly one place: its last statement. This
      includes guard clauses — an early `return` in a precondition check is still a second exit and is
      not allowed. Assign to one result and return it last, so the returned value is obvious at a
      glance. `throw` is the one permitted exception: it is not a return, it is unmistakable at the
      call site, and a `finally` still runs.
    - **Validate by nesting, not by leaving.** State the precondition as the condition that must
      hold, put the work inside it, and put the error path in the `else`. Where the caller is code,
      `throw` instead. Where the caller is a Node-RED flow, the `else` calls the error path — a flow
      must be told what went wrong, so there is always somewhere for it to go.
    - **Keep functions short enough that the nesting does not matter.** The usual objection to
      nesting is really an objection to long functions. In a function short enough to take in at a
      glance, one or two levels of indentation cost nothing at all. When the nesting does start to
      hurt, that is the signal to extract a function — never to add a second exit.
    - **Most likely case first within each branch.** Lead with what the function normally does and
      put the rare case in the `else`, so a reader meets the purpose before the exceptions.
    - **Trailing work belongs in `finally`.** If every path must log, clear a status or release
      something, put it in `finally` rather than repeating it before each exit. Combined with the
      single exit this makes the epilogue unskippable.
- **No defensive programming.** Don't test for states that cannot occur, and don't guard against
  hypothetical future changes to code you own — a `if (!alreadyHandled)` around code that cannot be
  reached is dead weight that later readers must still reason about. Validate at the boundary, then
  trust the data. Real I/O and real user input are boundaries; your own function two lines up is not.
