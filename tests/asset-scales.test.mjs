import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

test('Asset Scales & Display Sizing Audit', () => {
    const assetsDir = path.resolve('public/assets');
    const requiredImages = [
        'mahkota-icon.webp',
        'restart-icon.webp',
        'logo-bps.webp',
        'opening-game-bps.webp'
    ];

    // 1. Verify existence of asset files
    for (const img of requiredImages) {
        const fullPath = path.join(assetsDir, img);
        assert.ok(fs.existsSync(fullPath), `Asset file ${img} must exist in public/assets`);
        const stats = fs.statSync(fullPath);
        assert.ok(stats.size > 0, `Asset file ${img} must have non-zero size`);
    }

    // 2. Scan src/ to ensure no setScale with magic numbers on mahkota or restart-icon
    function walk(dir) {
        let results = [];
        for (const file of fs.readdirSync(dir)) {
            const full = path.join(dir, file);
            if (fs.statSync(full).isDirectory()) {
                results = results.concat(walk(full));
            } else if (file.endsWith('.js')) {
                results.push(full);
            }
        }
        return results;
    }

    const jsFiles = walk('src');
    for (const file of jsFiles) {
        const code = fs.readFileSync(file, 'utf8');

        // Check for regression: setScale(0.05) on crown
        assert.strictEqual(
            code.includes('.setScale(0.05)'),
            false,
            `File ${file} should not use hardcoded .setScale(0.05). Use .setDisplaySize() instead!`
        );

        // Check if mahkota image is added with setDisplaySize
        if (code.includes("'mahkota'") && code.includes('this.add.image') && code.includes('crownIcon')) {
            assert.ok(
                code.includes('.setDisplaySize('),
                `File ${file} must use setDisplaySize for crownIcon display sizing.`
            );
        }
    }
});
