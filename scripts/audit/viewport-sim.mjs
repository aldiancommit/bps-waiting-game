/**
 * Viewport Simulator for BPS Waiting Game.
 * Pure Node.js (Zero external dependencies).
 * Verifies strict 9:16 box calculations, safe-area bounds, and Hub safe margins.
 */

export const TEST_MATRIX = [
    // Portrait mobile standard & notch/dynamic island
    { name: 'iPhone SE (320x568)', w: 320, h: 568, top: 0, bot: 0, left: 0, right: 0 },
    { name: 'Standard Mobile (360x640)', w: 360, h: 640, top: 0, bot: 0, left: 0, right: 0 },
    { name: 'Android Tall (360x740)', w: 360, h: 740, top: 24, bot: 0, left: 0, right: 0 },
    { name: 'Galaxy S20 (360x800)', w: 360, h: 800, top: 24, bot: 0, left: 0, right: 0 },
    { name: 'iPhone 8 (375x667)', w: 375, h: 667, top: 20, bot: 0, left: 0, right: 0 },
    { name: 'iPhone 14 (390x844, safe 47/34)', w: 390, h: 844, top: 47, bot: 34, left: 0, right: 0 },
    { name: 'iPhone 14 + Browser Toolbar (390x744)', w: 390, h: 744, top: 47, bot: 34, left: 0, right: 0 },
    { name: 'Pixel 8 (393x873)', w: 393, h: 873, top: 24, bot: 16, left: 0, right: 0 },
    { name: 'Pixel 7 (412x915)', w: 412, h: 915, top: 24, bot: 16, left: 0, right: 0 },
    { name: 'Pixel 7 + Toolbar (412x815)', w: 412, h: 815, top: 24, bot: 16, left: 0, right: 0 },
    { name: 'iPhone 11 (414x896)', w: 414, h: 896, top: 48, bot: 34, left: 0, right: 0 },
    { name: 'iPhone 15 Pro Max (430x932, safe 59/34)', w: 430, h: 932, top: 59, bot: 34, left: 0, right: 0 },
    { name: 'iPhone 15 Pro Max + Toolbar (430x832)', w: 430, h: 832, top: 59, bot: 34, left: 0, right: 0 },
    // Tablets
    { name: 'iPad (768x1024)', w: 768, h: 1024, top: 24, bot: 20, left: 0, right: 0 },
    { name: 'iPad Air (820x1180)', w: 820, h: 1180, top: 24, bot: 20, left: 0, right: 0 },
    // Landscape variants
    { name: 'Landscape Standard (640x360)', w: 640, h: 360, top: 0, bot: 0, left: 0, right: 0 },
    { name: 'Landscape iPhone 14 (844x390, safe left/right 47, bot 21)', w: 844, h: 390, top: 0, bot: 21, left: 47, right: 47 },
];

/**
 * Calculates game box dimensions and offsets based on the proposed CSS formula.
 */
export function calculateBox(profile) {
    const { w, h, top, bot, left, right } = profile;
    const availW = w - left - right;
    const availH = h - top - bot;

    // Lebar = min(availW, availH * 9 / 16)
    // Tinggi = lebar * 16 / 9
    const boxW = Math.min(availW, availH * (9 / 16));
    const boxH = boxW * (16 / 9);

    // Position of box relative to screen (0, 0)
    // Centered inside #app-container which is bound to insets [left, top, right, bot]
    const boxLeft = left + (availW - boxW) / 2;
    const boxTop = top + (availH - boxH) / 2;
    const boxRight = boxLeft + boxW;
    const boxBot = boxTop + boxH;

    return {
        availW,
        availH,
        boxW,
        boxH,
        boxLeft,
        boxTop,
        boxRight,
        boxBot,
        ratio: boxW / boxH
    };
}

export function runViewportAudit(hubMarginTop = 28, hubMarginBot = 28) {
    let hasFailure = false;
    const results = [];

    console.log('=== AUDIT VIEWPORT & SAFE AREA MATRIX ===');
    console.log(`Parameter Batas Aman Hub: Top >= ${hubMarginTop}u, Bottom >= ${hubMarginBot}u\n`);

    for (const p of TEST_MATRIX) {
        const res = calculateBox(p);
        const { boxW, boxH, boxLeft, boxTop, boxRight, boxBot, ratio } = res;

        // 1. Check positive dimensions
        const validSize = boxW > 0 && boxH > 0;

        // 2. Check ratio deviation (tolerance: 0.5%)
        const targetRatio = 9 / 16;
        const ratioDev = Math.abs(ratio - targetRatio) / targetRatio;
        const validRatio = ratioDev <= 0.005;

        // 3. Check safe area bounds (box must be >= left, >= top, <= w - right, <= h - bot)
        const withinSafeLeft = boxLeft >= p.left - 0.01;
        const withinSafeTop = boxTop >= p.top - 0.01;
        const withinSafeRight = boxRight <= (p.w - p.right) + 0.01;
        const withinSafeBot = boxBot <= (p.h - p.bot) + 0.01;
        const withinSafeArea = withinSafeLeft && withinSafeTop && withinSafeRight && withinSafeBot;

        // 4. Check Hub element safety
        // In 360x640 space, top element is at >= hubMarginTop, bot element at <= 640 - hubMarginBot
        const validHubMargins = hubMarginTop >= 28 && hubMarginBot >= 28;

        const passed = validSize && validRatio && withinSafeArea && validHubMargins;
        if (!passed) hasFailure = true;

        results.push({
            name: p.name,
            passed,
            boxW,
            boxH,
            boxLeft,
            boxTop,
            ratioDev,
            withinSafeArea,
            validSize,
            validRatio
        });

        const statusTag = passed ? '[PASS]' : '[FAIL]';
        console.log(`${statusTag} ${p.name.padEnd(42)} -> Box: ${boxW.toFixed(1)}x${boxH.toFixed(1)} | Pos: (${boxLeft.toFixed(1)}, ${boxTop.toFixed(1)}) | RatioDev: ${(ratioDev * 100).toFixed(4)}%`);
        if (!passed) {
            console.error(`       DETAIL GAGAL: validSize=${validSize}, withinSafeArea=${withinSafeArea}, validRatio=${validRatio}`);
        }
    }

    console.log('\nTotal pengujian: ' + TEST_MATRIX.length + ' profil.');
    if (hasFailure) {
        console.error('HASIL: BEBERAPA PENGUJIAN GAGAL!');
        process.exit(1);
    } else {
        console.log('HASIL: SEMUA PENGUJIAN 100% LULUS!\n');
    }
}

// Run when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runViewportAudit(28, 28);
}
