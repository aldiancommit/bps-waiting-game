/**
 * External URL & Network Call Audit.
 * Scans built production bundle in dist/ to ensure zero unapproved external network requests,
 * no unapproved CDNs, no tracking scripts, and no captive-portal / private IP leftovers.
 */

import fs from 'fs';
import path from 'path';

console.log('=== AUDIT URL EKSTERNAL & KEAMANAN JARINGAN (DIST) ===\n');

if (!fs.existsSync('dist')) {
    console.error('[FAIL] Folder dist/ belum ada. Jalankan npm run build terlebih dahulu!');
    process.exit(1);
}

const ALLOWED_URLS = new Set([
    'http://www.w3.org/1999/xhtml',
    'http://www.w3.org/2000/svg',
    'http://www.w3.org/1999/xlink',
    'http://www.w3.org/XML/1998/namespace',
    'https://phaser.io'
]);

// Allowed URL prefixes (e.g. metadata)
const ALLOWED_PREFIXES = [
    'https://phaser.io',
    'http://www.w3.org/'
];

function isAllowedUrl(url) {
    if (ALLOWED_URLS.has(url)) return true;
    for (const prefix of ALLOWED_PREFIXES) {
        if (url.startsWith(prefix)) return true;
    }
    return false;
}

function walk(dir) {
    let results = [];
    for (const file of fs.readdirSync(dir)) {
        const full = path.join(dir, file);
        if (fs.statSync(full).isDirectory()) {
            results = results.concat(walk(full));
        } else if (file.endsWith('.html') || file.endsWith('.js') || file.endsWith('.css') || file.endsWith('.json')) {
            results.push(full);
        }
    }
    return results;
}

const files = walk('dist');
let failed = false;
let foundUrls = [];

console.log(`1. Memindai ${files.length} file di dist/ untuk URL eksternal...`);

const URL_REGEX = /https?:\/\/[^\s"'`<>{}|\\^]+[a-zA-Z0-9/]/g;
const IP_REGEX = /(?:192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|127\.0\.0\.1|localhost)/g;

for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    
    // Check for private IPs / captive portal leftovers
    const ipMatches = content.match(IP_REGEX);
    if (ipMatches) {
        for (const ip of ipMatches) {
            console.error(`  [FAIL] ${file}: Ditemukan IP lokal/captive-portal tersisa: ${ip}`);
            failed = true;
        }
    }

    // Check for URLs
    const matches = content.match(URL_REGEX);
    if (matches) {
        for (const url of matches) {
            // Clean trailing punct
            const cleanUrl = url.replace(/[),;]+$/, '');
            foundUrls.push({ file, url: cleanUrl });
            if (!isAllowedUrl(cleanUrl)) {
                console.error(`  [FAIL] ${file}: URL eksternal tidak diizinkan terdeteksi: ${cleanUrl}`);
                failed = true;
            }
        }
    }
}

// Summary of found URLs
const uniqueUrls = [...new Set(foundUrls.map(u => u.url))];
console.log(`\n2. Rekapitulasi URL di Bundle Produksi (${uniqueUrls.length} URL unik ditemukan):`);
for (const u of uniqueUrls) {
    const status = isAllowedUrl(u) ? '[ALLOWED]' : '[FORBIDDEN]';
    console.log(`  ${status} ${u}`);
}

if (failed) {
    console.error('\nHASIL AUDIT JARINGAN: DITEMUKAN URL EKSTERNAL ILEGAL!');
    process.exit(1);
} else {
    console.log('\nHASIL AUDIT JARINGAN: LULUS (Semua URL Terdaftar & Diizinkan, 0 Leak)!\n');
}
