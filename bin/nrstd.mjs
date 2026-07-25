#!/usr/bin/env node
// nrstd — tool-neutral CLI to align Node-RED node repos with the shared standard.
// Usage:
//   nrstd audit [repoDir]
//   nrstd sync  [repoDir] [--write] [--force]
//   nrstd scaffold <name> [targetDir] [--write]
import { runAudit } from '../lib/audit.mjs';
import { runSync } from '../lib/sync.mjs';
import { runScaffold } from '../lib/scaffold.mjs';
import { runMigrate } from '../lib/migrate.mjs';

const [, , cmd, ...rest] = process.argv;
const flags = new Set(rest.filter((a) => a.startsWith('--')));
const args = rest.filter((a) => !a.startsWith('--'));

function main() {
    if (cmd === 'audit') {
        const { report, pass, total } = runAudit(args[0] || '.');
        console.log(report);
        process.exitCode = pass === total ? 0 : 1;
    } else if (cmd === 'sync') {
        const write = flags.has('--write');
        const { name, actions } = runSync(args[0] || '.', { write, force: flags.has('--force'), removeLegacy: flags.has('--remove-legacy') });
        console.log(`${write ? 'Applied' : 'Dry-run (use --write)'} sync for ${name}:`);
        for (const a of actions) console.log(`  ${a.action.padEnd(24)} ${a.file}`);
    } else if (cmd === 'scaffold') {
        if (!args[0]) return usage('scaffold needs a package name');
        const write = flags.has('--write');
        const { base, written } = runScaffold(args[1] || '.', args[0], { write });
        console.log(`${write ? 'Created' : 'Dry-run (use --write)'} ${written.length} files under ${base}`);
        for (const f of written) console.log(`  ${f}`);
    } else if (cmd === 'migrate-tests') {
        const write = flags.has('--write');
        const { files, note } = runMigrate(args[0] || '.', { write });
        if (note) return console.log(note);
        console.log(`${write ? 'Migrated' : 'Dry-run (use --write)'} mocha/chai -> node:test:`);
        for (const f of files)
            console.log(`  ${f.action.padEnd(20)} ${f.file}${f.dest && f.dest !== f.file ? ' -> ' + f.dest : ''}  (converted ${f.converted}, flagged ${f.flagged})`);
    } else {
        usage();
    }
}

function usage(msg) {
    if (msg) console.error('Error: ' + msg + '\n');
    console.error('nrstd audit [repoDir]');
    console.error('nrstd sync  [repoDir] [--write] [--force] [--remove-legacy]');
    console.error('nrstd scaffold <name> [targetDir] [--write]');
    console.error('nrstd migrate-tests [repoDir] [--write]');
    process.exitCode = 2;
}
main();
