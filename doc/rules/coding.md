# Coding rules (detail)

Rationale and detail behind the enforceable rules in `templates/AGENTS.md`.

- **Modular layout.** Keep logic in `lib/` so it is testable without a Node-RED runtime.
  `nodes/*.js` should be thin: parse `msg`, call into `lib/`, set `node.status`, send.
- **Entry file.** `<pkg>/99-<name>.js` only registers node types. No business logic.
- **ESLint flat config.** Use `eslint.config.js` with `@eslint/js` recommended + `eslint-config-prettier`.
  Warnings for style, errors for correctness (`no-empty` with `allowEmptyCatch`, etc.).
- **Prettier.** 4-space indent, single quotes, es5 trailing commas, printWidth 120.
- **Node engine.** `>=20.0.0`.
