# node-red-standards

Tool-neutral standard for the windkh Node-RED node repositories. Rules are Markdown
(`AGENTS.md`, portable across Codex/Cursor/Copilot/Claude/…); automation is plain Node — no AI
required to run it.

## What's inside
- **Rules**: `templates/AGENTS.md` (ships into each repo) + `doc/rules/*.md` (rationale).
- **Templates**: `templates/` — eslint flat config, prettier, node:test (c8 coverage), CI + publish + standards-check
  workflows, dependabot, and a thin `CLAUDE.md` that just imports `AGENTS.md`.
- **CLI** (`nrstd`): `audit`, `sync`, `scaffold`, `migrate-tests`. Deterministic, offline.

## Install (does NOT need to be public)

The CLI runs fully offline; only *getting* it onto a machine differs. The standards repo and your
node repos can all stay **private**. Pick one:

**A. Local checkout / `npm link` (nothing published):**
```bash
git clone <url> node-red-standards
# run directly:
node ./node-red-standards/bin/nrstd.mjs audit
# or expose it as a global `nrstd` command:
cd node-red-standards && npm link      # then, anywhere:  nrstd audit
```

**B. Private GitHub repo (recommended — no registry):** `npx` runs straight from Git (private repos
work with your GitHub auth / `gh auth login`):
```bash
npx github:windkh/node-red-standards audit
# or pin it as a dev dependency in a node repo:
npm i -D github:windkh/node-red-standards
```

**C. npm registry (optional):** publish only if you want the short `npx node-red-standards` with no auth.
- **Public:** `npm publish` (package is already publish-ready; run `npm pack --dry-run` to preview).
- **Private (scoped):** rename to `@windkh/node-red-standards`, add `"publishConfig": { "access": "restricted" }`,
  then `npm publish` (requires a paid npm org). Use as `npx @windkh/node-red-standards audit`.

> In the examples below, `npx node-red-standards` is the published-name form. If you use A or B,
> substitute `node ./node-red-standards/bin/nrstd.mjs` or `npx github:windkh/node-red-standards`.

## Use it in a node repo
```bash
npx node-red-standards audit           # report gaps vs the standard
npx node-red-standards sync --write    # write missing config/rule files
npx node-red-standards sync --write --remove-legacy   # also delete superseded files (.eslintrc*, dup .prettierrc, ci.yml/release.yml)
npx node-red-standards scaffold node-red-contrib-foo . --write
npx node-red-standards migrate-tests --write   # rewrite mocha+chai specs to node:test (best-effort)
```

## Roll out to all repos
Three neutral options, pick one:
1. **CI gate** — add `templates/workflows/standards-check.yml` to each repo; `nrstd audit` fails CI on drift.
2. **Scheduled PRs** — `.github/workflows/sync.yml` here runs `nrstd sync --write` per repo and opens PRs.
3. **Manual** — run `npx node-red-standards sync --write` locally, commit.

## How-to (step by step)

### 0. Make the CLI available
See **Install** above and pick A (local / `npm link`), B (private GitHub via `npx github:…`),
or C (npm publish). No public repo required. The commands below use the published-name form.

### 1. Bring an existing repo up to standard
```bash
cd node-red-contrib-<name>
git checkout -b chore/standards-sync
npx node-red-standards audit                        # 1. see the gaps (X/10)
npx node-red-standards sync                          # 2. dry-run: review planned changes
npx node-red-standards sync --write --remove-legacy  # 3. apply + delete superseded files
npx node-red-standards migrate-tests --write         # 4. only mocha repos: rewrite specs to node:test
npm install && npm run lint && npm run format:check && node --test   # 5. verify
# 6. resolve any TODO(migrate-tests) markers, then:
git add -A && git commit -m "chore: align to shared standard" && gh pr create
```

### 2. Start a new node package
```bash
npx node-red-standards scaffold node-red-contrib-<name> . --write
cd node-red-contrib-<name> && npm install && node --test   # green out of the box
# implement your logic in <name>/lib/, wire nodes in <name>/nodes/
```

### 3. Roll out to all repos
Pick one (see "Roll out to all repos" above): CI gate, scheduled PRs, or manual.
Suggested order: ntrip → contrib-telegrambot / vallox → shelly / grohe → node-telegrambot.

### 4. Change the standard itself
Edit `templates/AGENTS.md` (rules) or a file under `templates/` (config), bump the version in
`package.json`, re-publish/checkout, then re-run `sync` across the repos. Never add tool-specific
logic — keep everything portable.

### CLI reference
| Command | Does | Writes files? |
|---|---|---|
| `nrstd audit [dir]` | Compliance report vs the standard (X/10) | no |
| `nrstd sync [dir] [--write] [--force] [--remove-legacy]` | Apply templates + package.json scripts/engines/devDeps; optional cleanup | with `--write` |
| `nrstd scaffold <name> [dir] [--write]` | New standard-compliant modular package | with `--write` |
| `nrstd migrate-tests [dir] [--write]` | Rewrite mocha+chai specs to node:test (best-effort; flags unmapped) | with `--write` |

All commands default to a dry-run and print what they would do; add `--write` to apply.

## Portability
Each repo ends up with a self-contained `AGENTS.md` (works with any AI tool) and a one-line
`CLAUDE.md` that imports it. Switching AI platforms means swapping the thin adapter, not the rules.
The optional Claude plugin only wraps the same CLI for convenience — it holds no logic.
