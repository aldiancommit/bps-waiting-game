/**
 * Automated Screenshot Verification via Playwright Chromium.
 * Serves production dist/ bundle locally, captures screenshots for Hub, Tenten,
 * and Memory Angka across target device profiles, and stores them in docs/qa/.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
let chromium;
try {
    const pw = await import('playwright');
    chromium = pw.chromium;
} catch {
    const npxPwPath = '/home/geewonii/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
    const pw = await import(npxPwPath);
    chromium = pw.chromium;
}

const PORT = 4173;
const DIST_DIR = path.resolve('dist');
const QA_DIR = path.resolve('docs/qa');

if (!fs.existsSync(QA_DIR)) {
    fs.mkdirSync(QA_DIR, { recursive: true });
}

// 1. Simple static HTTP server for dist/
function startServer() {
    const MIME = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf',
        '.svg': 'image/svg+xml'
    };

    const server = http.createServer((req, res) => {
        let reqPath = req.url.split('?')[0];
        if (reqPath === '/') reqPath = '/index.html';
        const filePath = path.join(DIST_DIR, reqPath);

        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath);
            res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
            fs.createReadStream(filePath).pipe(res);
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    });

    return new Promise(resolve => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

async function capture() {
    console.log('=== PENGAMBILAN SCREENSHOT VERIFIKASI VISUAL (PLAYWRIGHT) ===\n');

    const server = await startServer();
    console.log(`[1/4] Server preview lokal aktif di http://127.0.0.1:${PORT}`);

    const browser = await chromium.launch({ headless: true });

    const profiles = [
        { id: 'hp-pemilik', name: 'HP Pemilik (360x711, DPR 2)', w: 360, h: 711, dpr: 2 },
        { id: 'iphone14', name: 'iPhone 14 (390x844, DPR 3)', w: 390, h: 844, dpr: 3 },
        { id: 'galaxy-s20', name: 'Galaxy S20 (360x800, DPR 3)', w: 360, h: 800, dpr: 3 },
        { id: 'standard', name: 'Standard 16:9 (360x640, DPR 2)', w: 360, h: 640, dpr: 2 }
    ];

    for (const p of profiles) {
        console.log(`\n[2/4] Menguji profil: ${p.name}`);
        const context = await browser.newContext({
            viewport: { width: p.w, height: p.h },
            deviceScaleFactor: p.dpr,
            isMobile: true,
            hasTouch: true
        });

        const page = await context.newPage();
        await page.goto(`http://127.0.0.1:${PORT}/`);

        // Wait for OpeningScene transition (1.6s) to HubScene
        await page.waitForTimeout(2500);

        // Capture HubScene
        const hubFile = path.join(QA_DIR, `${p.id}-hub.png`);
        await page.screenshot({ path: hubFile });
        console.log(`  -> Screenshot Hub tersimpan: ${path.basename(hubFile)}`);

        // Navigate to Tenten
        await page.evaluate(() => {
            if (window.__bpsGame) {
                window.__bpsGame.scene.stop('HubScene');
                window.__bpsGame.scene.start('BlockPuzzleScene');
            }
        });
        await page.waitForTimeout(1000);
        const tentenFile = path.join(QA_DIR, `${p.id}-tenten.png`);
        await page.screenshot({ path: tentenFile });
        console.log(`  -> Screenshot Tenten tersimpan: ${path.basename(tentenFile)}`);

        // Navigate to Memory Angka
        await page.evaluate(() => {
            if (window.__bpsGame) {
                window.__bpsGame.scene.stop('BlockPuzzleScene');
                window.__bpsGame.scene.start('MemoryScene', { level: 1 });
            }
        });
        await page.waitForTimeout(1000);
        const memoryFile = path.join(QA_DIR, `${p.id}-memory.png`);
        await page.screenshot({ path: memoryFile });
        console.log(`  -> Screenshot Memory Angka tersimpan: ${path.basename(memoryFile)}`);

        await context.close();
    }

    await browser.close();
    server.close();
    console.log('\n[PASS] Seluruh screenshot berhasil diambil dan disimpan di docs/qa/!\n');
}

capture().catch(err => {
    console.error('[FAIL] Gagal mengambil screenshot:', err);
    process.exit(1);
});
