// Copy canonical templates into a target repo. Dry-run by default; pass write:true to apply.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPkg } from './rules.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const T = path.join(ROOT, 'templates');

const read = (p) => fs.readFileSync(p, 'utf8');
const exists = (p) => fs.existsSync(p);

// template file -> destination path in the repo
const MAP = [
    ['eslint.config.js', 'eslint.config.js'],
    ['.prettierrc.json', '.prettierrc.json'],
    ['AGENTS.md', 'AGENTS.md'],
    ['CLAUDE.md', 'CLAUDE.md'],
    ['claude-settings.json', '.claude/settings.json'],
    ['dependabot.yml', '.github/dependabot.yml'],
    ['workflows/node.js.yml', '.github/workflows/node.js.yml'],
    ['workflows/npm-publish.yml', '.github/workflows/npm-publish.yml'],
];

const REQUIRED_DEV = {
    '@eslint/js': '^9.0.0',
    globals: '^15.0.0',
    'eslint-config-prettier': '^9.0.0',
    eslint: '^9.0.0',
    prettier: '^3.0.0',
    c8: '^10.0.0',
    'node-red-node-test-helper': '^0.3.4',
};

const REQUIRED_SCRIPTS = {
    lint: 'eslint .',
    'lint:fix': 'eslint . --fix',
    format: 'prettier --write .',
    'format:check': 'prettier --check .',
    test: 'node --test',
    coverage: 'c8 node --test',
    'coverage:check': 'c8 --check-coverage node --test',
};

export function runSync(repo, { write = false, force = false, removeLegacy = false } = {}) {
    const pkg = readPkg(repo);
    const name = pkg.name || path.basename(path.resolve(repo));
    const actions = [];

    for (const [src, dst] of MAP) {
        const from = path.join(T, src);
        const to = path.join(repo, dst);
        let content = read(from);
        if (src === 'AGENTS.md' || src === 'CLAUDE.md') content = content.replaceAll('<REPO_NAME>', name);
        const present = exists(to);
        if (present && !force) {
            const same = read(to) === content;
            actions.push({ file: dst, action: same ? 'unchanged' : 'differs (kept; use --force)' });
            if (!same && write && force) {
                /* handled below */
            }
            continue;
        }
        actions.push({ file: dst, action: present ? 'overwrite' : 'create' });
        if (write) {
            fs.mkdirSync(path.dirname(to), { recursive: true });
            fs.writeFileSync(to, content);
        }
    }

    // doc/architecture stubs (content is repo-specific; only create if missing)
    const docs = [
        ['doc/architecture/overview.md', '# Overview\n\nTODO: what this package does and its runtime model.\n'],
        ['doc/architecture/structural-design.md', '# Structural design\n\nTODO: modules in lib/ and nodes/ and their responsibilities.\n'],
        ['doc/architecture/behavioural-design.md', '# Behavioural design\n\nTODO: runtime flows and message handling.\n'],
        ['doc/architecture/adr/README.md', '# ADR log\n\nOne file per decision: NNNN-title.md (Context / Decision / Consequences).\n'],
    ];
    for (const [rel, content] of docs) {
        const to = path.join(repo, rel);
        if (exists(to)) {
            actions.push({ file: rel, action: 'unchanged' });
            continue;
        }
        actions.push({ file: rel, action: 'create' });
        if (write) {
            fs.mkdirSync(path.dirname(to), { recursive: true });
            fs.writeFileSync(to, content);
        }
    }

    // merge package.json scripts + engines
    const pkgPath = path.join(repo, 'package.json');
    if (exists(pkgPath)) {
        const p = readPkg(repo);
        p.scripts = p.scripts || {};
        let changed = false;
        const ENFORCE = new Set(['test', 'coverage', 'coverage:check']); // runner-defining scripts
        for (const [k, v] of Object.entries(REQUIRED_SCRIPTS)) {
            if (!p.scripts[k]) {
                p.scripts[k] = v;
                changed = true;
                actions.push({ file: `package.json scripts.${k}`, action: 'add' });
            } else if (ENFORCE.has(k) && p.scripts[k] !== v) {
                p.scripts[k] = v;
                changed = true;
                actions.push({ file: `package.json scripts.${k}`, action: 'set (node:test)' });
            }
        }
        p.engines = p.engines || {};
        if (!/2\d|[3-9]\d/.test(String(p.engines.node || ''))) {
            p.engines.node = '>=20.0.0';
            changed = true;
            actions.push({ file: 'package.json engines.node', action: 'set >=20.0.0' });
        }
        p.devDependencies = p.devDependencies || {};
        for (const [k, v] of Object.entries(REQUIRED_DEV))
            if (!p.devDependencies[k] && !(p.dependencies || {})[k]) {
                p.devDependencies[k] = v;
                changed = true;
                actions.push({ file: `package.json devDependencies.${k}`, action: 'add' });
            }
        if (write && changed) fs.writeFileSync(pkgPath, JSON.stringify(p, null, 4) + '\n');
    }

    // optional cleanup of superseded files (opt-in)
    if (removeLegacy) {
        const legacy = [
            '.eslintrc',
            '.eslintrc.js',
            '.eslintrc.cjs',
            '.eslintrc.json',
            '.eslintrc.yaml',
            '.eslintrc.yml',
            '.eslintignore',
            '.github/workflows/ci.yml', // superseded by node.js.yml
            '.github/workflows/release.yml', // superseded by npm-publish.yml
        ];
        // prettier duplicate: standard is .prettierrc.json, so drop bare .prettierrc
        if (exists(path.join(repo, '.prettierrc'))) legacy.push('.prettierrc');
        for (const rel of legacy) {
            const to = path.join(repo, rel);
            if (!exists(to)) continue;
            actions.push({ file: rel, action: 'remove (legacy)' });
            if (write) fs.rmSync(to, { force: true });
        }
        // drop legacy eslint-plugin-prettier from package.json devDependencies
        const pkgPath2 = path.join(repo, 'package.json');
        if (exists(pkgPath2)) {
            const p2 = readPkg(repo);
            if (p2.devDependencies && p2.devDependencies['eslint-plugin-prettier']) {
                delete p2.devDependencies['eslint-plugin-prettier'];
                actions.push({ file: 'package.json devDependencies.eslint-plugin-prettier', action: 'remove (legacy)' });
                if (write) fs.writeFileSync(pkgPath2, JSON.stringify(p2, null, 4) + '\n');
            }
        }
    }

    return { name, actions, write, force };
}
