#!/usr/bin/env node
/**
 * audit-texture-scale.mjs
 * Rejects raw setScale() on optimized textures that should use setDisplaySize().
 * These textures were resized (image optimization) so any setScale() with
 * hardcoded numbers will produce wrong display sizes.
 *
 * Usage: node scripts/audit/audit-texture-scale.mjs
 * Exit 0 = pass, Exit 1 = violations found
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const PROTECTED_TEXTURES = ['mahkota', 'restart-icon', 'logo-bps', 'opening-game-bps'];
const SRC_DIR = join(import.meta.dirname, '..', '..', 'src');

// Recursively find all .js files
function walk(dir) {
    const results = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) results.push(...walk(full));
        else if (full.endsWith('.js')) results.push(full);
    }
    return results;
}

const violations = [];

for (const file of walk(SRC_DIR)) {
    const lines = readFileSync(file, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip comments
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

        // Pattern: .setScale(<number>) on a line that also references a protected texture
        // or on a variable known to hold one (crownIcon, bpsLogo, restartImg, splash)
        const varAliases = ['crownIcon', 'bpsLogo', 'restartImg', 'splash'];
        const hasProtectedRef = PROTECTED_TEXTURES.some(t => line.includes(`'${t}'`)) ||
                                varAliases.some(v => line.includes(v));

        if (hasProtectedRef && /\.setScale\s*\(\s*[\d.]+/.test(line)) {
            violations.push({
                file: relative(join(SRC_DIR, '..'), file),
                line: i + 1,
                content: line.trim()
            });
        }
    }
}

if (violations.length > 0) {
    console.error('❌ Found setScale() on optimized textures (use setDisplaySize instead):');
    for (const v of violations) {
        console.error(`  ${v.file}:${v.line}  ${v.content}`);
    }
    process.exit(1);
} else {
    console.log('✅ No setScale() violations on protected textures.');
    process.exit(0);
}
