/**
 * Compatibility Checker for BPS Waiting Game.
 * Scans bundle assets with es-check (ES2021 / iOS 15 / Chrome 100)
 * and verifies that no forbidden modern browser APIs (roundRect, letterSpacing, etc.) are used.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('=== AUDIT KOMPATIBILITAS (ES2021 / iOS 15+ / Chrome 100+) ===\n');

let failed = false;

// 1. Run es-check
try {
    console.log('[1/2] Menjalankan es-check es2021 pada dist/assets/*.js...');
    const out = execSync('npx -y es-check es2021 --module "dist/assets/*.js"', { encoding: 'utf8' });
    console.log(out.trim());
    console.log('[PASS] Bundle dist/ lolos uji sintaks ES2021 (kompatibel iOS 15 & Chrome 100).');
} catch (err) {
    console.error('[FAIL] es-check gagal:', err.stdout || err.message);
    failed = true;
}

// 2. Scan forbidden modern APIs in src/
console.log('\n[2/2] Memeriksa penggunaan API modern tanpa fallback di src/...');
const forbiddenPatterns = [
    { name: 'ctx.roundRect', regex: /\.roundRect\(/ },
    { name: 'ctx.letterSpacing', regex: /\.letterSpacing\s*=/ },
    { name: 'structuredClone', regex: /\bstructuredClone\(/ },
    { name: 'Array.prototype.at', regex: /\b\w+\.at\(/ },
    { name: 'ResizeObserver', regex: /\bResizeObserver\b/ }
];

function scanDir(dir) {
    let files = [];
    for (const item of fs.readdirSync(dir)) {
        const full = path.join(dir, item);
        if (fs.statSync(full).isDirectory()) {
            files = files.concat(scanDir(full));
        } else if (item.endsWith('.js')) {
            files.push(full);
        }
    }
    return files;
}

const srcFiles = scanDir('src');
for (const f of srcFiles) {
    const code = fs.readFileSync(f, 'utf8');
    for (const p of forbiddenPatterns) {
        if (p.regex.test(code)) {
            console.error(`[FAIL] Ditemukan ${p.name} di ${f}`);
            failed = true;
        }
    }
}

if (!failed) {
    console.log('[PASS] Nol API terlarang ditemukan di seluruh kode sumber src/.');
    console.log('\nHASIL AUDIT KOMPATIBILITAS: 100% LULUS!\n');
} else {
    console.error('\nHASIL AUDIT KOMPATIBILITAS: DITEMUKAN PELANGGARAN!');
    process.exit(1);
}
