// Deterministic standard checks. No AI, no network. Pure fs inspection.
import fs from 'node:fs';
import path from 'node:path';

const exists = (p) => fs.existsSync(p);
const read = (p) => (exists(p) ? fs.readFileSync(p, 'utf8') : null);

export function readPkg(repo) {
    const p = path.join(repo, 'package.json');
    try {
        return JSON.parse(read(p) || '{}');
    } catch {
        return {};
    }
}

// Best-effort: locate the node package directory (the one holding nodes/ or the entry file).
export function nodeDir(repo, pkg) {
    const nodes = pkg?.['node-red']?.nodes || {};
    const first = Object.values(nodes)[0];
    if (first) return path.join(repo, path.dirname(first));
    return null;
}

export function audit(repo) {
    const pkg = readPkg(repo);
    const nd = nodeDir(repo, pkg);
    const has = (rel) => exists(path.join(repo, rel));
    const dev = { ...(pkg.devDependencies || {}), ...(pkg.dependencies || {}) };
    const scripts = pkg.scripts || {};
    const eng = String(pkg.engines?.node || '');
    const engOk = /(>=?\s*|\^|~)?(2\d|[3-9]\d)/.test(eng); // >= 20

    const checks = [
        {
            id: 'modular',
            label: 'Modular layout (lib/ + nodes/)',
            ok: nd ? exists(path.join(nd, 'nodes')) : false,
            note: nd ? path.relative(repo, path.join(nd, 'nodes')) : 'no node dir found',
        },
        { id: 'eslint-flat', label: 'ESLint flat config', ok: has('eslint.config.js'), note: 'eslint.config.js' },
        {
            id: 'prettier',
            label: 'Prettier standalone + format script',
            ok: (has('.prettierrc.json') || has('.prettierrc')) && !!scripts.format,
            note: 'need .prettierrc(.json) + scripts.format',
        },
        {
            id: 'test-runner',
            label: 'node:test + node-red-node-test-helper',
            ok: /node\s+--test/.test(scripts.test || '') && !!dev['node-red-node-test-helper'],
            note: "scripts.test = 'node --test' + devDep node-red-node-test-helper",
        },
        { id: 'agents', label: 'AGENTS.md (portable rules)', ok: has('AGENTS.md'), note: 'AGENTS.md' },
        { id: 'claude', label: 'CLAUDE.md adapter', ok: has('CLAUDE.md'), note: 'CLAUDE.md → @AGENTS.md' },
        {
            id: 'doc-arch',
            label: 'doc/architecture/ + ADR',
            ok: has('doc/architecture/overview.md') && has('doc/architecture/adr'),
            note: 'doc/architecture/{overview.md,adr/}',
        },
        { id: 'dependabot', label: 'Dependabot', ok: has('.github/dependabot.yml'), note: '.github/dependabot.yml' },
        { id: 'engines', label: 'node engines >= 20', ok: engOk, note: `engines.node = "${eng}"` },
        {
            id: 'scripts',
            label: 'Standard package.json scripts',
            ok: ['lint', 'format', 'test', 'coverage'].every((s) => !!scripts[s]),
            note: 'lint, format, test, coverage(:check)',
        },
    ];
    return { pkg, checks };
}
