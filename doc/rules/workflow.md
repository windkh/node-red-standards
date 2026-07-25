# Workflow rules (detail)

- **CI** (`.github/workflows/node.js.yml`): `npm ci` → lint → format:check → test → coverage:check,
  matrix Node 20/22.
- **Release** (`.github/workflows/npm-publish.yml`): on GitHub release, publish to npm with `NPM_TOKEN`.
- **Dependabot** (`.github/dependabot.yml`): weekly npm + github-actions updates.
- **Versioning.** One task = one patch bump + matching CHANGELOG entry, same commit.
