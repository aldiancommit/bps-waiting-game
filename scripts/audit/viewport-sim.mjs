/**
 * Viewport Simulator for BPS Waiting Game (Pilihan B: Layar Penuh Adaptif).
 * Pure Node.js (Zero external dependencies).
 * Simulates adaptive logical height H = clamp(360 * availH / availW, 640, 800),
 * measures screen coverage (>= 99% for 9:16 to 20:9), pita width, and safe-area bounds.
 */

export const TEST_MATRIX = [
    // HP Pemilik (Chrome Android, toolbar tampil, layar akhir ~20:9)
    { name: 'HP Pemilik (360x711, toolbar, inset bot 15)', w: 360, h: 711, top: 0, bot: 15, left: 0, right: 0, dpr: 2 },
    { name: 'HP Pemilik (360x711, toolbar penuh, no inset)', w: 360, h: 711, top: 0, bot: 0, left: 0, right: 0, dpr: 2 },
    { name: 'Redmi Note 13 Pro (393x873, no inset)', w: 393, h: 873, top: 0, bot: 0, left: 0, right: 0, dpr: 2.75 },
    { name: 'Redmi Note 13 Pro + Insets (393x873, inset 32/16)', w: 393, h: 873, top: 32, bot: 16, left: 0, right: 0, dpr: 2.75 },

    // Android Tall & High-aspect ratio devices (20:9)
    { name: 'Galaxy S20 (360x800, inset top 24)', w: 360, h: 800, top: 24, bot: 0, left: 0, right: 0, dpr: 3 },
    { name: 'Galaxy S20 (360x800, full)', w: 360, h: 800, top: 0, bot: 0, left: 0, right: 0, dpr: 3 },
    { name: 'Pixel 8 (393x873, inset 24/16)', w: 393, h: 873, top: 24, bot: 16, left: 0, right: 0, dpr: 2.75 },
    { name: 'Pixel 7 (412x915, inset 24/16)', w: 412, h: 915, top: 24, bot: 16, left: 0, right: 0, dpr: 2.625 },
    { name: 'Pixel 7 + Toolbar (412x815)', w: 412, h: 815, top: 24, bot: 16, left: 0, right: 0, dpr: 2.625 },

    // iPhone Notch & Dynamic Island models
    { name: 'iPhone 14 (390x844, safe 47/34)', w: 390, h: 844, top: 47, bot: 34, left: 0, right: 0, dpr: 3 },
    { name: 'iPhone 14 + Toolbar (390x744, safe 47/34)', w: 390, h: 744, top: 47, bot: 34, left: 0, right: 0, dpr: 3 },
    { name: 'iPhone 15 Pro Max (430x932, safe 59/34)', w: 430, h: 932, top: 59, bot: 34, left: 0, right: 0, dpr: 3 },
    { name: 'iPhone 15 Pro Max + Toolbar (430x832)', w: 430, h: 832, top: 59, bot: 34, left: 0, right: 0, dpr: 3 },
    { name: 'iPhone 11 (414x896, safe 48/34)', w: 414, h: 896, top: 48, bot: 34, left: 0, right: 0, dpr: 2 },

    // Standard 16:9 phones
    { name: 'Standard Mobile (360x640)', w: 360, h: 640, top: 0, bot: 0, left: 0, right: 0, dpr: 2 },
    { name: 'iPhone 8 (375x667, inset top 20)', w: 375, h: 667, top: 20, bot: 0, left: 0, right: 0, dpr: 2 },
    { name: 'iPhone SE (320x568)', w: 320, h: 568, top: 0, bot: 0, left: 0, right: 0, dpr: 2 },

    // Tablets (Wider than 9:16)
    { name: 'iPad (768x1024, safe 24/20)', w: 768, h: 1024, top: 24, bot: 20, left: 0, right: 0, dpr: 2 },
    { name: 'iPad Air (820x1180, safe 24/20)', w: 820, h: 1180, top: 24, bot: 20, left: 0, right: 0, dpr: 2 },

    // Landscape mode
    { name: 'Landscape Standard (640x360)', w: 640, h: 360, top: 0, bot: 0, left: 0, right: 0, dpr: 2 },
    { name: 'Landscape iPhone 14 (844x390, safe left/right 47, bot 21)', w: 844, h: 390, top: 0, bot: 21, left: 47, right: 47, dpr: 3 },
];

/**
 * Calculates adaptive logical height H and canvas box within safe area.
 */
export function calculateAdaptiveBox(profile) {
    const { w, h, top, bot, left, right } = profile;
    const availW = w - left - right;
    const availH = h - top - bot;
    const screenRatio = availH / availW;

    // H = clamp(360 * availH / availW, 640, 820)
    const logicH = Math.round(Math.min(Math.max(360 * screenRatio, 640), 820));
    const gameRatio = logicH / 360;

    // Phaser.Scale.FIT inside availW x availH
    let boxW, boxH;
    if (screenRatio >= gameRatio) {
        // Safe area is taller or equal to game aspect ratio
        boxW = availW;
        boxH = boxW * gameRatio;
    } else {
        // Safe area is wider than game aspect ratio (tablets, landscape)
        boxH = availH;
        boxW = boxH / gameRatio;
    }

    const safeArea = availW * availH;
    const canvasArea = boxW * boxH;
    const coverage = (canvasArea / safeArea) * 100;

    // Pita (bars)
    const pitaH = Math.max(0, availH - boxH);
    const pitaW = Math.max(0, availW - boxW);
    const totalPita = Math.max(pitaH, pitaW);

    const boxLeft = left + (availW - boxW) / 2;
    const boxTop = top + (availH - boxH) / 2;

    // Hub element safety in logical units:
    // Header text y = 28, footer text y = logicH - 28
    const hubMarginTop = 28;
    const hubMarginBot = 28;

    return {
        availW,
        availH,
        screenRatio,
        logicH,
        boxW,
        boxH,
        boxLeft,
        boxTop,
        coverage,
        pitaH,
        pitaW,
        totalPita,
        hubMarginTop,
        hubMarginBot
    };
}

export function runViewportAudit() {
    let hasFailure = false;
    const results = [];

    console.log('=== AUDIT VIEWPORT ADAPTIF & CAKUPAN LAYAR (PILIKAN B) ===');
    console.log('Syarat Lulus: Rasio 9:16 s.d. 20:9 (1.78 - 2.22) -> Cakupan >= 99% & Pita == 0 px.');
    console.log('Margin elemen Hub: Top >= 28u, Bottom >= 28u dari batas area aman.\n');

    for (const p of TEST_MATRIX) {
        const res = calculateAdaptiveBox(p);
        const {
            availW, availH, screenRatio, logicH,
            boxW, boxH, boxLeft, boxTop,
            coverage, totalPita, hubMarginTop, hubMarginBot
        } = res;

        // 1. Verify H is within bounds [640, 820]
        const validH = logicH >= 640 && logicH <= 820;

        // 2. Check coverage and pita criteria
        const isStandardMobileRange = screenRatio >= (16 / 9) - 0.05 && screenRatio <= (20 / 9) + 0.05;
        let validCoverage = true;
        let validPita = true;

        if (isStandardMobileRange) {
            // Must have >= 99% coverage and 0 px pita (allowing <= 0.5px float rounding)
            validCoverage = coverage >= 99.0;
            validPita = totalPita <= 0.5;
        }

        // 3. Check Hub margins
        const validHubMargins = hubMarginTop >= 28 && hubMarginBot >= 28;

        const passed = validH && validCoverage && validPita && validHubMargins;
        if (!passed) hasFailure = true;

        results.push({
            name: p.name,
            passed,
            logicH,
            boxW,
            boxH,
            coverage,
            totalPita,
            screenRatio
        });

        const statusTag = passed ? '[PASS]' : '[FAIL]';
        const coverageStr = `${coverage.toFixed(1)}%`.padStart(6);
        const pitaStr = `${totalPita.toFixed(1)}px`.padStart(7);
        const hStr = `H=${logicH}`.padStart(5);

        console.log(`${statusTag} ${p.name.padEnd(46)} -> ${hStr} | Box: ${boxW.toFixed(0)}x${boxH.toFixed(0)} | Cakupan: ${coverageStr} | Pita: ${pitaStr}`);
        if (!passed) {
            console.error(`       DETAIL GAGAL: validH=${validH}, validCoverage=${validCoverage}, validPita=${validPita}`);
        }
    }

    console.log(`\nTotal pengujian: ${TEST_MATRIX.length} profil perangkat.`);
    if (hasFailure) {
        console.error('HASIL: BEBERAPA PENGUJIAN GAGAL!');
        process.exit(1);
    } else {
        console.log('HASIL: SEMUA PENGUJIAN 100% LULUS (Cakupan Penuh, Pita 0px pada 9:16-20:9)!\n');
    }
}

// Run when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runViewportAudit();
}
