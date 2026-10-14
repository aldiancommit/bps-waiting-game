/**
 * Invariant & Performance Validation Suite for Memory Angka Level Generator.
 * Uses node:test and node:assert.
 */

import test from 'node:test';
import assert from 'node:assert';
import { getLevelConfig } from '../src/games/memory-angka/data/Levels.js';
import { generateLevelLayout } from '../src/games/memory-angka/utils/LevelGenerator.js';
import { Mulberry32, hashInts } from '../src/games/memory-angka/utils/Rng.js';

test('Memory Angka - Valid Level Configs (Levels 1..60)', () => {
    for (let lvl = 1; lvl <= 60; lvl++) {
        const cfg = getLevelConfig(lvl);
        assert.ok(cfg, `Config exists for level ${lvl}`);
        assert.ok(cfg.cols >= 3, `Cols >= 3 for level ${lvl}`);
        assert.ok(cfg.rows >= 4, `Rows >= 4 for level ${lvl}`);
        assert.ok(cfg.numCount >= 3, `NumCount >= 3 for level ${lvl}`);
        assert.ok(cfg.numCount <= cfg.cols * cfg.rows, `NumCount fits within grid for level ${lvl}`);
    }
});

test('Memory Angka - Generator Invariants across 1,000 Seeds', () => {
    let maxExecTime = 0;
    let totalExecTime = 0;

    for (let i = 1; i <= 1000; i++) {
        const level = (i % 50) + 1;
        const attemptSalt = (i * 17) ^ (i << 3);
        const config = getLevelConfig(level);

        const t0 = performance.now();
        const layout = generateLevelLayout(config, attemptSalt);
        const dt = performance.now() - t0;

        totalExecTime += dt;
        if (dt > maxExecTime) maxExecTime = dt;

        assert.ok(layout && layout.cells, `Layout returned for test ${i}`);
        assert.strictEqual(layout.cells.length, config.numCount, `Cell count matches numCount for test ${i}`);

        const indices = new Set();
        const values = new Set();

        for (const cell of layout.cells) {
            assert.ok(!indices.has(cell.index), `No duplicate index in test ${i}`);
            indices.add(cell.index);

            assert.ok(!values.has(cell.value), `No duplicate value in test ${i}`);
            values.add(cell.value);

            assert.ok(cell.index >= 0 && cell.index < config.cols * config.rows, `Index in bounds for test ${i}`);
            assert.ok(cell.value >= 1 && cell.value <= config.numCount, `Value in 1..N for test ${i}`);
        }
    }

    const avgExecTime = totalExecTime / 1000;
    assert.ok(avgExecTime < 2.0, `Average generation time < 2.0ms (actual: ${avgExecTime.toFixed(3)}ms)`);
});

test('Memory Angka - PRNG Mulberry32 Determinism', () => {
    const seed = 123456789;
    const rng1 = new Mulberry32(seed);
    const rng2 = new Mulberry32(seed);

    for (let i = 0; i < 100; i++) {
        assert.strictEqual(rng1.next(), rng2.next(), `Divergence at iteration ${i}`);
    }

    assert.strictEqual(hashInts(10, 20, 30), hashInts(10, 20, 30), 'Hash must be strictly deterministic');
});

test('Memory Angka - Soft DDA Multiplier Limits (-25% to +25%)', async () => {
    const { getDdaTimeMultiplier } = await import('../src/games/memory-angka/utils/Difficulty.js');

    // Default / neutral
    assert.strictEqual(getDdaTimeMultiplier([]), 1.0);
    assert.strictEqual(getDdaTimeMultiplier([{ success: true }]), 1.0);

    // Failures (mercy boost +15% to +25%)
    const failHist = [
        { success: false, mistakes: 2 },
        { success: false, mistakes: 2 },
        { success: false, mistakes: 3 }
    ];
    const mercyMult = getDdaTimeMultiplier(failHist);
    assert.ok(mercyMult >= 1.0 && mercyMult <= 1.25, `Mercy multiplier in [1.0, 1.25], got ${mercyMult}`);

    // High mastery (tighten -15% to -20%)
    const masterHist = [
        { success: true, mistakes: 0, usedPeek: false, timeRatio: 0.5 },
        { success: true, mistakes: 0, usedPeek: false, timeRatio: 0.5 },
        { success: true, mistakes: 0, usedPeek: false, timeRatio: 0.5 }
    ];
    const masterMult = getDdaTimeMultiplier(masterHist);
    assert.ok(masterMult >= 0.75 && masterMult <= 1.0, `Mastery multiplier in [0.75, 1.0], got ${masterMult}`);
});
