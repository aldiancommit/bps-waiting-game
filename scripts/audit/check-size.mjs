/**
 * Bundle & Asset Size Budget Checker for BPS Waiting Game.
 * Evaluates raw and gzip sizes against defined performance budgets in budgets.json.
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

console.log('=== AUDIT UKURAN DIST & ASSET BUDGETS ===\n');

const budgetFile = path.resolve('scripts/audit/budgets.json');
if (!fs.existsSync(budgetFile)) {
    console.error('[FAIL] budgets.json tidak ditemukan!');
    process.exit(1);
}

const budgets = JSON.parse(fs.readFileSync(budgetFile, 'utf8'));

if (!fs.existsSync('dist')) {
    console.error('[FAIL] Folder dist/ belum ada. Jalankan npm run build lebih dulu!');
    process.exit(1);
}

function walk(dir) {
    let results = [];
    for (const file of fs.readdirSync(dir)) {
        const full = path.join(dir, file);
        if (fs.statSync(full).isDirectory()) {
            results = results.concat(walk(full));
        } else {
            results.push(full);
        }
    }
    return results;
}

const files = walk('dist');
let totalRaw = 0;
let totalGzip = 0;
let totalBrotli = 0;
let jsRaw = 0;
let jsGzip = 0;
let imagesRaw = 0;
let fontsRaw = 0;

for (const f of files) {
    const buf = fs.readFileSync(f);
    const raw = buf.length;
    const gz = zlib.gzipSync(buf).length;
    const br = zlib.brotliCompressSync(buf).length;

    totalRaw += raw;
    totalGzip += gz;
    totalBrotli += br;

    if (f.endsWith('.js')) {
        jsRaw += raw;
        jsGzip += gz;
    } else if (f.endsWith('.webp') || f.endsWith('.png') || f.endsWith('.svg') || f.endsWith('.ico')) {
        imagesRaw += raw;
    } else if (f.endsWith('.woff2') || f.endsWith('.woff') || f.endsWith('.ttf')) {
        fontsRaw += raw;
    }
}

console.log(`- Total Dist Raw    : ${totalRaw} B (${(totalRaw / 1024).toFixed(2)} KB) | Budget: <= ${budgets.totalDistRawMaxBytes} B`);
console.log(`- Total Dist Gzip   : ${totalGzip} B (${(totalGzip / 1024).toFixed(2)} KB) | Budget: <= ${budgets.totalDistGzipMaxBytes} B`);
console.log(`- Total Dist Brotli : ${totalBrotli} B (${(totalBrotli / 1024).toFixed(2)} KB)`);
console.log(`- JS Gzip           : ${jsGzip} B (${(jsGzip / 1024).toFixed(2)} KB) | Budget: <= ${budgets.jsGzipMaxBytes} B`);
console.log(`- Total Images      : ${imagesRaw} B (${(imagesRaw / 1024).toFixed(2)} KB) | Budget: <= ${budgets.totalImagesMaxBytes} B (<= 60 KB)`);
console.log(`- Total Fonts       : ${fontsRaw} B (${(fontsRaw / 1024).toFixed(2)} KB) | Budget: <= ${budgets.totalFontsMaxBytes} B (<= 90 KB)`);

let failed = false;

if (totalRaw > budgets.totalDistRawMaxBytes) {
    console.error(`[FAIL] Total Dist Raw (${totalRaw} B) melampaui batas (${budgets.totalDistRawMaxBytes} B)!`);
    failed = true;
}
if (totalGzip > budgets.totalDistGzipMaxBytes) {
    console.error(`[FAIL] Total Dist Gzip (${totalGzip} B) melampaui batas (${budgets.totalDistGzipMaxBytes} B)!`);
    failed = true;
}
if (jsGzip > budgets.jsGzipMaxBytes) {
    console.error(`[FAIL] JS Gzip (${jsGzip} B) melampaui batas (${budgets.jsGzipMaxBytes} B)!`);
    failed = true;
}
if (imagesRaw > budgets.totalImagesMaxBytes) {
    console.error(`[FAIL] Total Gambar (${imagesRaw} B) melampaui batas (${budgets.totalImagesMaxBytes} B)!`);
    failed = true;
}
if (fontsRaw > budgets.totalFontsMaxBytes) {
    console.error(`[FAIL] Total Font (${fontsRaw} B) melampaui batas (${budgets.totalFontsMaxBytes} B)!`);
    failed = true;
}

if (failed) {
    console.error('\nHASIL AUDIT UKURAN: ANGGARAN TERLAMPAUI!');
    process.exit(1);
} else {
    console.log('\nHASIL AUDIT UKURAN: SEMUA ANGGARAN LULUS (100% PASS)!\n');
}
