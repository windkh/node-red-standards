// Scaffold a new standard-compliant modular node package.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const T = path.join(ROOT, 'templates');
const read = (p) => fs.readFileSync(p, 'utf8');

export function runScaffold(targetDir, fullName, { write = false } = {}) {
    // fullName e.g. node-red-contrib-foo -> pkg key "foo"
    const key = fullName.replace(/^node-red-(contrib-|node-)?/, '');
    const files = {};
    files['package.json'] =
        JSON.stringify(
            {
                name: fullName,
                version: '0.1.0',
                description: `${key} nodes for Node-RED`,
                'node-red': { version: '>=3.0.0', nodes: { [key]: `${key}/99-${key}.js` } },
                engines: { node: '>=20.0.0' },
                scripts: {
                    lint: 'eslint .',
                    'lint:fix': 'eslint . --fix',
                    format: 'prettier --write .',
                    'format:check': 'prettier --check .',
                    test: 'node --test --test-force-exit --test-timeout=30000 --test-concurrency=1',
                    coverage: 'c8 npm test',
                    'coverage:check': 'c8 --check-coverage npm test',
                },
                devDependencies: {
                    '@eslint/js': '^9.0.0',
                    globals: '^15.0.0',
                    'eslint-config-prettier': '^9.0.0',
                    eslint: '^9.0.0',
                    prettier: '^3.0.0',
                    c8: '^10.0.0',
                    'node-red': '^4.0.0',
                    'node-red-node-test-helper': '^0.3.4',
                },
                license: 'MIT',
            },
            null,
            4
        ) + '\n';
    files[`${key}/99-${key}.js`] =
        `// Entry point: thin delegator. Logic lives in lib/, nodes in nodes/.\nmodule.exports = function (RED) {\n    'use strict';\n    require('./nodes/${key}-node.js')(RED);\n};\n`;
    files[`${key}/nodes/${key}-node.js`] =
        `const core = require('../lib/${key}.js');\nmodule.exports = function (RED) {\n    function ${cap(key)}Node(config) {\n        RED.nodes.createNode(this, config);\n        const node = this;\n        node.on('input', (msg, send, done) => {\n            try {\n                msg.payload = core.process(msg.payload);\n                send(msg);\n                done();\n            } catch (e) {\n                done(e);\n            }\n        });\n    }\n    RED.nodes.registerType('${key}', ${cap(key)}Node);\n};\n`;
    files[`${key}/lib/${key}.js`] =
        `'use strict';\n// Pure, unit-testable core logic. No Node-RED imports here.\nfunction process(payload) {\n    return payload; // TODO implement\n}\nmodule.exports = { process };\n`;
    files[`test/${key}.test.js`] =
        `const { describe, it } = require('node:test');\nconst assert = require('node:assert');\nconst core = require('../${key}/lib/${key}.js');\ndescribe('${key} core', () => {\n    it('passes payload through (placeholder)', () => {\n        assert.strictEqual(core.process(1), 1);\n    });\n});\n`;
    files['AGENTS.md'] = read(path.join(T, 'AGENTS.md')).replaceAll('<REPO_NAME>', fullName);
    files['CLAUDE.md'] = read(path.join(T, 'CLAUDE.md')).replaceAll('<REPO_NAME>', fullName);
    files['.claude/settings.json'] = read(path.join(T, 'claude-settings.json'));
    files['eslint.config.js'] = read(path.join(T, 'eslint.config.js'));
    files['.prettierrc.json'] = read(path.join(T, '.prettierrc.json'));
    files['.github/dependabot.yml'] = read(path.join(T, 'dependabot.yml'));
    files['.github/workflows/node.js.yml'] = read(path.join(T, 'workflows/node.js.yml'));
    files['.github/workflows/npm-publish.yml'] = read(path.join(T, 'workflows/npm-publish.yml'));
    files['doc/architecture/overview.md'] = `# Overview\n\nTODO: what ${fullName} does.\n`;
    files['doc/architecture/adr/README.md'] = `# ADR log\n\nOne file per decision: NNNN-title.md (Context / Decision / Consequences).\n`;
    files['CHANGELOG.md'] = `# Changelog\n\n## [0.1.0]\n### Initial scaffold\n`;

    const base = path.join(targetDir, fullName);
    const written = [];
    for (const [rel, content] of Object.entries(files)) {
        const to = path.join(base, rel);
        written.push(rel);
        if (write) {
            fs.mkdirSync(path.dirname(to), { recursive: true });
            fs.writeFileSync(to, content);
        }
    }
    return { base, written, write };
}

function cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
