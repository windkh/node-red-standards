import path from 'node:path';
import { audit } from './rules.mjs';

export function runAudit(repo) {
    const { pkg, checks } = audit(repo);
    const pass = checks.filter((c) => c.ok).length;
    const lines = [];
    lines.push(`# Standard audit: ${pkg.name || path.basename(path.resolve(repo))}`);
    lines.push('');
    lines.push(`Compliance: ${pass}/${checks.length}`);
    lines.push('');
    lines.push('| Rule | Status | Note |');
    lines.push('|---|---|---|');
    for (const c of checks) lines.push(`| ${c.label} | ${c.ok ? '✅' : '❌'} | ${c.ok ? '' : c.note} |`);
    const gaps = checks.filter((c) => !c.ok);
    if (gaps.length) {
        lines.push('');
        lines.push('## Fixes needed');
        for (const g of gaps) lines.push(`- ${g.label} — run \`nrstd sync\` (or add manually): ${g.note}`);
    }
    return { report: lines.join('\n'), pass, total: checks.length, gaps: gaps.map((g) => g.id) };
}
