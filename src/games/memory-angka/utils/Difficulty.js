/**
 * Soft Dynamic Difficulty Adjustment (DDA) for Memory Angka.
 * Monitors player accuracy & pace across recent levels to calibrate memorization time
 * within safe bounded limits (-25% to +25%) without altering grid progression.
 */

import { MEMORY_STORAGE_KEYS } from '../data/Constants.js';

export function loadDdaHistory() {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(MEMORY_STORAGE_KEYS.DDA_DATA);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed.slice(-5);
        }
    } catch (e) { }
    return [];
}

export function saveDdaHistory(history) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(MEMORY_STORAGE_KEYS.DDA_DATA, JSON.stringify(history.slice(-5)));
    } catch (e) { }
}

export function recordLevelAttempt(result) {
    // result: { level: number, success: boolean, mistakes: number, usedPeek: boolean, timeRatio: number }
    const history = loadDdaHistory();
    history.push({
        level: result.level,
        success: !!result.success,
        mistakes: result.mistakes || 0,
        usedPeek: !!result.usedPeek,
        timeRatio: Math.max(0, Math.min(1, result.timeRatio || 1)),
        timestamp: Date.now()
    });
    saveDdaHistory(history);
    return history;
}

/**
 * Calculates adaptive time multiplier in range [0.75, 1.25].
 */
export function getDdaTimeMultiplier(history) {
    if (!history || history.length < 2) return 1.0;

    const recent = history.slice(-3);
    const failures = recent.filter(h => !h.success || h.mistakes >= 2).length;
    const perfects = recent.filter(h => h.success && h.mistakes === 0 && !h.usedPeek && h.timeRatio < 0.65).length;

    if (failures >= 2) {
        // Mercy bonus: grant +15% to +25% extra memorization time
        return failures === 3 ? 1.25 : 1.15;
    }

    if (perfects >= 3) {
        // High mastery: tighten time by -15% to -20%
        return 0.82;
    } else if (perfects === 2) {
        return 0.90;
    }

    return 1.0;
}

export function getAdjustedShowMs(baseShowMs, history = null) {
    const hist = history || loadDdaHistory();
    const mult = getDdaTimeMultiplier(hist);
    const adjusted = Math.round(baseShowMs * mult);
    return Math.max(1000, Math.min(7000, adjusted));
}
