/**
 * Level definitions and progression bands for Memory Angka.
 * 30 structured campaign levels across 5 difficulty bands + Endless mode generator.
 */

import { calculateBaseShowMs } from './Constants.js';

export const LEVEL_BANDS = [
    { minLevel: 1, maxLevel: 3, cols: 3, rows: 4, minNumbers: 3, maxNumbers: 4, baseDifficulty: 0.10 },
    { minLevel: 4, maxLevel: 8, cols: 4, rows: 4, minNumbers: 4, maxNumbers: 6, baseDifficulty: 0.25 },
    { minLevel: 9, maxLevel: 14, cols: 4, rows: 5, minNumbers: 6, maxNumbers: 9, baseDifficulty: 0.40 },
    { minLevel: 15, maxLevel: 22, cols: 5, rows: 5, minNumbers: 8, maxNumbers: 12, baseDifficulty: 0.60 },
    { minLevel: 23, maxLevel: 30, cols: 5, rows: 6, minNumbers: 10, maxNumbers: 15, baseDifficulty: 0.80 }
];

export const TOTAL_CAMPAIGN_LEVELS = 30;

/**
 * Returns level configuration for level N (1..30 or endless 31+).
 */
export function getLevelConfig(level) {
    const isEndless = level > TOTAL_CAMPAIGN_LEVELS;
    
    // Order rule: Every multiple of 5 starting from level 10 is DESC (Urut Turun), others ASC (Urut Naik)
    const orderRule = (level >= 10 && level % 5 === 0) ? 'DESC' : 'ASC';

    if (isEndless) {
        const endlessStep = level - TOTAL_CAMPAIGN_LEVELS;
        const numCount = Math.min(18, 12 + Math.floor(endlessStep / 2));
        const targetDiff = Math.min(1.0, 0.85 + (endlessStep * 0.02));
        const baseShowMs = calculateBaseShowMs(numCount, level);

        return {
            level,
            isEndless: true,
            cols: 5,
            rows: 6,
            numCount,
            orderRule,
            baseShowMs,
            targetDifficulty: targetDiff,
            bandName: 'ENDLESS'
        };
    }

    const band = LEVEL_BANDS.find(b => level >= b.minLevel && level <= b.maxLevel) || LEVEL_BANDS[LEVEL_BANDS.length - 1];
    const bandSpan = band.maxLevel - band.minLevel;
    const bandProgress = bandSpan > 0 ? (level - band.minLevel) / bandSpan : 0;
    
    const numCount = Math.round(band.minNumbers + (band.maxNumbers - band.minNumbers) * bandProgress);
    const targetDiff = band.baseDifficulty + bandProgress * 0.15;
    const baseShowMs = calculateBaseShowMs(numCount, level);

    return {
        level,
        isEndless: false,
        cols: band.cols,
        rows: band.rows,
        numCount,
        orderRule,
        baseShowMs,
        targetDifficulty: targetDiff,
        bandName: `BAND_${band.cols}x${band.rows}`
    };
}
