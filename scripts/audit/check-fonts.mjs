/**
 * Local Fonts and Typography Audit.
 * Verifies local woff2 files, font size budgets, and zero external font CDN links.
 */

import fs from 'fs';
import path from 'path';

console.log('=== AUDIT FONT & TIPOGRAFI LOKAL ===\n');

let failed = false;
const fontsDir = path.resolve('public/fonts');
const budgetFile = path.resolve('scripts/audit/budgets.json');

// 1. Verify public/fonts directory
if (!fs.existsSync(fontsDir)) {
    console.error('[FAIL] Folder public/fonts tidak ditemukan!');
    process.exit(1);
}

// 2. Check font files
const requiredFonts = [
    'Poppins-Regular.woff2',
    'Poppins-Bold.woff2',
    'Inter-Variable.woff2'
];

const fontFiles = fs.readdirSync(fontsDir);
console.log('1. Memeriksa Keberadaan File Font WOFF2 Lokal:');
for (const req of requiredFonts) {
    if (fontFiles.includes(req)) {
        const stats = fs.statSync(path.join(fontsDir, req));
        console.log(`  [PASS] ${req} (${stats.size} B / ${(stats.size / 1024).toFixed(2)} KB)`);
    } else {
        console.error(`  [FAIL] Font wajib "${req}" tidak ditemukan di public/fonts/!`);
        failed = true;
    }
}

// Check for non-woff2 font files
for (const file of fontFiles) {
    if (!file.endsWith('.woff2') && (file.endsWith('.ttf') || file.endsWith('.otf') || file.endsWith('.woff'))) {
        console.error(`  [FAIL] Ditemukan file font non-woff2 "${file}". Wajib gunakan format woff2 yang terkompresi!`);
        failed = true;
    }
}

// 3. Check font budget
let totalBytes = 0;
for (const file of fontFiles) {
    totalBytes += fs.statSync(path.join(fontsDir, file)).size;
}

let maxFontBytes = 92160; // default 90 KB
if (fs.existsSync(budgetFile)) {
    const budgets = JSON.parse(fs.readFileSync(budgetFile, 'utf8'));
    maxFontBytes = budgets.totalFontsMaxBytes ?? maxFontBytes;
}

console.log(`\n2. Memeriksa Total Ukuran Font:`);
console.log(`  Total Font: ${totalBytes} B (${(totalBytes / 1024).toFixed(2)} KB) | Budget: <= ${maxFontBytes} B (${(maxFontBytes / 1024).toFixed(2)} KB)`);
if (totalBytes > maxFontBytes) {
    console.error(`  [FAIL] Total ukuran font melampaui batas anggaran ${maxFontBytes} B!`);
    failed = true;
} else {
    console.log(`  [PASS] Ukuran font sesuai anggaran (tersisa ${((maxFontBytes - totalBytes) / 1024).toFixed(2)} KB).`);
}

// 4. Check for external font CDN links in index.html and src/
console.log('\n3. Memeriksa Ketiadaan CDN Font Eksternal (Google Fonts, Typekit, dsb):');
const forbiddenCdns = [
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'use.typekit.net',
    'cdn.jsdelivr.net/font',
    'cdnjs.cloudflare.com/ajax/libs/font'
];

function checkFilesForCdn(filePaths) {
    for (const f of filePaths) {
        if (!fs.existsSync(f)) continue;
        const content = fs.readFileSync(f, 'utf8');
        for (const cdn of forbiddenCdns) {
            if (content.includes(cdn)) {
                console.error(`  [FAIL] File "${f}" mengandung referensi font eksternal: ${cdn}`);
                failed = true;
            }
        }
    }
}

function walkSrc(dir) {
    let files = [];
    for (const f of fs.readdirSync(dir)) {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) {
            files = files.concat(walkSrc(full));
        } else if (f.endsWith('.js') || f.endsWith('.css') || f.endsWith('.html')) {
            files.push(full);
        }
    }
    return files;
}

const filesToCheck = ['index.html', ...walkSrc('src')];
checkFilesForCdn(filesToCheck);

console.log(`  [PASS] 0 CDN font eksternal ditemukan di ${filesToCheck.length} file sumber.`);

// 5. Check docs/LICENSES.md
console.log('\n4. Memeriksa Dokumentasi Lisensi Font (docs/LICENSES.md):');
if (fs.existsSync('docs/LICENSES.md')) {
    const licenseText = fs.readFileSync('docs/LICENSES.md', 'utf8');
    if (licenseText.includes('Poppins') && licenseText.includes('Inter') && licenseText.includes('Public Pixel')) {
        console.log('  [PASS] docs/LICENSES.md mendokumentasikan Poppins, Inter, dan status Public Pixel.');
    } else {
        console.error('  [FAIL] docs/LICENSES.md tidak lengkap!');
        failed = true;
    }
} else {
    console.error('  [FAIL] docs/LICENSES.md tidak ditemukan!');
    failed = true;
}

if (failed) {
    console.error('\nHASIL AUDIT FONT: GAGAL!');
    process.exit(1);
} else {
    console.log('\nHASIL AUDIT FONT: LULUS (Semua Font Lokal, Sesuai Anggaran, Lisensi Terdokumentasi)!\n');
}
