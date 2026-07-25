# AGENTS.md — node-red-standards (maintainer guide)

This repo is the tool-neutral source of truth for the windkh Node-RED node repositories.
It is NOT Claude-specific: the rules live in Markdown and the automation is plain Node.

## Layout
- `templates/AGENTS.md` — the portable ruleset that ships into every node repo. Edit rules here.
- `doc/rules/*.md` — longer rationale behind each rule (maintainer reading).
- `templates/` — canonical config files (eslint, prettier, workflows, dependabot, CLAUDE.md adapter).
- `bin/nrstd.mjs` + `lib/*.mjs` — the CLI (audit / sync / scaffold). Deterministic, no AI, no network.

## Working here
- To change a rule: edit `templates/AGENTS.md` (and the matching `doc/rules/*.md`). Bump version. Roll out.
- To change a config default: edit the file under `templates/`.
- Never put logic that only works inside one AI tool into this repo.

## Commands
- `node bin/nrstd.mjs audit <repo>` — compliance report
- `node bin/nrstd.mjs sync <repo> [--write] [--force]` — apply templates
- `node bin/nrstd.mjs scaffold <name> <dir> [--write]` — new node package
- `node bin/nrstd.mjs migrate-tests <repo> [--write]` — rewrite mocha+chai specs to node:test (best-effort; flags unmapped)
