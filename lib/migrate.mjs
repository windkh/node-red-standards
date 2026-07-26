// Best-effort migration of mocha+chai specs to node:test + node:assert.
// Deterministic text transform. Anything it cannot map is left intact with a TODO marker.
import fs from 'node:fs';
import path from 'node:path';

// find index of ')' matching the '(' at openIdx
function matchParen(s, openIdx) {
    let depth = 0;
    for (let i = openIdx; i < s.length; i++) {
        if (s[i] === '(') depth++;
        else if (s[i] === ')') {
            depth--;
            if (depth === 0) return i;
        }
    }
    return -1;
}

function splitTopLevel(str) {
    const parts = []; let depth = 0, cur = '';
    for (const c of str) {
        if (c === '(' || c === '[' || c === '{') depth++;
        else if (c === ')' || c === ']' || c === '}') depth--;
        if (c === ',' && depth === 0) { parts.push(cur); cur = ''; } else cur += c;
    }
    if (cur.trim()) parts.push(cur);
    return parts;
}

// extract the balanced arg of the first '(' at/after idx; returns {arg, end}
function argAt(s, idx) {
    const open = s.indexOf('(', idx);
    if (open === -1) return null;
    const close = matchParen(s, open);
    if (close === -1) return null;
    return { arg: s.slice(open + 1, close), end: close + 1 };
}

function convertExpect(src) {
    let out = '';
    let i = 0;
    let flagged = 0;
    let converted = 0;
    while (true) {
        const idx = src.indexOf('expect(', i);
        if (idx === -1) {
            out += src.slice(i);
            break;
        }
        out += src.slice(i, idx);
        const subj = argAt(src, idx + 'expect'.length);
        if (!subj) {
            out += src.slice(idx);
            break;
        }
        // tail = from end of expect(...) to end of statement (';' at depth 0)
        let j = subj.end,
            depth = 0,
            tailEnd = -1;
        for (let k = j; k < src.length; k++) {
            const c = src[k];
            if (c === '(') depth++;
            else if (c === ')') depth--;
            else if (c === ';' && depth === 0) {
                tailEnd = k;
                break;
            } else if (c === '\n' && depth === 0) {
                tailEnd = k;
                break;
            }
        }
        if (tailEnd === -1) tailEnd = src.length;
        const tail = src.slice(j, tailEnd).trim();
        const rep = mapAssertion(subj.arg.trim(), tail);
        if (rep === null) {
            out += `/* TODO(migrate-tests): review */ expect(${subj.arg})${src.slice(j, tailEnd)}`;
            flagged++;
        } else {
            out += rep;
            converted++;
        }
        i = tailEnd;
    }
    return { code: out, flagged, converted };
}

function mapAssertion(subj, tail) {
    // tail starts with '.to'
    let t = tail.replace(/^\.to/, '');
    const negate = t.startsWith('.not');
    if (negate) t = t.replace(/^\.not/, '');
    const arg = (prefixLen) => argAt(t, prefixLen);
    if (t.startsWith('.deep.equal') || t.startsWith('.eql')) {
        const a = arg(0);
        if (a) return `assert.${negate ? 'notDeepStrictEqual' : 'deepStrictEqual'}(${subj}, ${a.arg.trim()})`;
    }
    if (t.startsWith('.equal')) {
        const a = arg(0);
        if (a) return `assert.${negate ? 'notStrictEqual' : 'strictEqual'}(${subj}, ${a.arg.trim()})`;
    }
    if (t.startsWith('.be.a') || t.startsWith('.be.an')) {
        const a = arg(0);
        if (a) return `assert.strictEqual(typeof ${subj}, ${a.arg.trim()})`;
    }
    if (t.startsWith('.be.true')) return `assert.strictEqual(${subj}, true)`;
    if (t.startsWith('.be.false')) return `assert.strictEqual(${subj}, false)`;
    if (t.startsWith('.be.null')) return `assert.strictEqual(${subj}, null)`;
    if (t.startsWith('.be.undefined')) return `assert.strictEqual(${subj}, undefined)`;
    if (t.startsWith('.have.property')) {
        const a = arg(0);
        if (a) return `assert.ok(Object.prototype.hasOwnProperty.call(${subj}, ${a.arg.trim()}))`;
    }
    if (t.startsWith('.have.lengthOf') || t.startsWith('.have.length')) {
        const a = arg(0);
        if (a) return `assert.strictEqual((${subj}).length, ${a.arg.trim()})`;
    }
    if (t.startsWith('.throw')) return `assert.throws(${subj})`;
    if (t.startsWith('.exist')) return `assert.ok(${subj} !== undefined && ${subj} !== null)`;
    if (t.startsWith('.include') || t.startsWith('.contain')) {
        const a = arg(0);
        if (a) return `assert.ok(${negate ? '!' : ''}(${subj}).includes(${a.arg.trim()}))`;
    }
    if (t.startsWith('.match')) {
        const a = arg(0);
        if (a) return `assert.${negate ? 'doesNotMatch' : 'match'}(${subj}, ${a.arg.trim()})`;
    }
    if (t.startsWith('.be.closeTo') || t.startsWith('.be.approximately')) {
        const a = arg(0);
        if (a) {
            const parts = splitTopLevel(a.arg);
            if (parts.length >= 2) return `assert.ok(Math.abs(${subj} - (${parts[0].trim()})) <= ${parts[1].trim()})`;
        }
    }
    const cmp = [
        ['.be.greaterThanOrEqual', '>='],
        ['.be.at.least', '>='],
        ['.be.lessThanOrEqual', '<='],
        ['.be.at.most', '<='],
        ['.be.greaterThan', '>'],
        ['.be.above', '>'],
        ['.be.lessThan', '<'],
        ['.be.below', '<'],
    ];
    for (const [pat, op] of cmp) {
        if (t.startsWith(pat)) {
            const a = arg(0);
            if (a) return `assert.ok(${negate ? '!(' : ''}${subj} ${op} ${a.arg.trim()}${negate ? ')' : ''})`;
        }
    }
    if (t.startsWith('.be.instanceof') || t.startsWith('.be.instanceOf') || t.startsWith('.be.an.instanceof')) {
        const a = arg(0);
        if (a) return `assert.ok(${subj} instanceof ${a.arg.trim()})`;
    }
    return null;
}

function fixImports(code) {
    // strip chai / mocha requires
    code = code
        .split('\n')
        .filter((l) => !/require\(['"]chai['"]\)/.test(l) && !/require\(['"]mocha['"]\)/.test(l))
        .join('\n');
    // which hooks/describe used
    const hooks = ['describe', 'it', 'before', 'after', 'beforeEach', 'afterEach'].filter((h) =>
        new RegExp(`\\b${h}\\s*\\(`).test(code)
    );
    const testImport = `const { ${hooks.join(', ')} } = require('node:test');`;
    const assertImport = `const assert = require('node:assert');`;
    const lines = code.split('\n');
    let insertAt = 0;
    for (let k = 0; k < Math.min(lines.length, 5); k++) {
        if (/^\s*'use strict';/.test(lines[k])) {
            insertAt = k + 1;
            break;
        }
    }
    lines.splice(insertAt, 0, testImport, assertImport);
    return lines.join('\n');
}

export function reprocess(src) {
    const { code } = convertExpect(src);
    // strip now-stale TODO markers that precede a successfully converted assert
    return code.replace(/\/\* TODO\(migrate-tests\): review \*\/ (?=assert\.)/g, '');
}

export function migrateSource(src) {
    const { code, flagged, converted } = convertExpect(src);
    return { code: fixImports(code), flagged, converted };
}

export function runMigrate(repo, { write = false } = {}) {
    const testDir = path.join(repo, 'test');
    if (!fs.existsSync(testDir)) return { files: [], note: 'no test/ directory' };
    // recursively collect *.spec.js / *.test.js under test/ (skips fixtures without those suffixes)
    const files = [];
    (function walk(dir) {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            const abs = path.join(dir, e.name);
            if (e.isDirectory()) walk(abs);
            else if (/\.(spec|test)\.c?js$/.test(e.name)) files.push(path.relative(repo, abs));
        }
    })(testDir);
    const results = [];
    for (const rel of files) {
        const abs = path.join(repo, rel);
        const src = fs.readFileSync(abs, 'utf8');
        if (!/require\(['"]chai['"]\)|require\(['"]mocha['"]\)|\bexpect\(/.test(src)) {
            results.push({ file: rel, action: 'skip (no mocha/chai)', converted: 0, flagged: 0 });
            continue;
        }
        const { code, flagged, converted } = migrateSource(src);
        const dest = rel.replace(/\.spec\.(c?js)$/, '.test.$1');
        results.push({ file: rel, dest, action: dest === rel ? 'rewrite' : 'rewrite+rename', converted, flagged });
        if (write) {
            fs.writeFileSync(path.join(repo, dest), code);
            if (dest !== rel) {
                try {
                    fs.rmSync(abs, { force: true });
                } catch {
                    // filesystem forbids unlink (e.g. mounted volume): leave a delete-me stub
                    fs.writeFileSync(abs, `// Migrated to ${path.basename(dest)} — safe to delete (git rm ${path.basename(abs)}).\n`);
                    results[results.length - 1].action = 'rewrite+stub (delete old .spec.js manually)';
                }
            }
        }
    }
    return { files: results, write };
}
