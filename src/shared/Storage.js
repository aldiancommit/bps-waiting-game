/**
 * LocalStorage management for BPS Games.
 * Shared across game modules with specific namespace keys.
 * Wrapped in try/catch to remain resilient on iOS CNA / Private Browsing.
 */

export const TENTEN_STORAGE_KEYS = {
    HIGH_SCORE: 'bps_game_tenten_highscore',
    SAVE_STATE: 'bps_game_tenten_savestate',
    MUTED: 'bps_game_tenten_muted'
};

export const MEMORY_STORAGE_KEYS = {
    SCHEMA_VERSION: 'bps_game_memory_v1',
    UNLOCKED_LEVEL: 'bps_game_memory_unlocked',
    LEVEL_STARS: 'bps_game_memory_stars',
    LEVEL_SCORES: 'bps_game_memory_scores',
    TOTAL_SCORE: 'bps_game_memory_totalscore',
    DDA_DATA: 'bps_game_memory_dda',
    MUTED: 'bps_game_tenten_muted' // shared mute setting
};

// ── Tenten Storage Helpers ─────────────────────────────────

export function getHighScore(key = TENTEN_STORAGE_KEYS.HIGH_SCORE, legacyKey = 'bps_1010_highscore') {
    if (typeof window === 'undefined') return 0;
    try {
        const current = localStorage.getItem(key);
        if (current !== null) {
            return parseInt(current, 10) || 0;
        }
        if (legacyKey) {
            const legacy = localStorage.getItem(legacyKey);
            if (legacy !== null) {
                const val = parseInt(legacy, 10) || 0;
                localStorage.setItem(key, val.toString());
                return val;
            }
        }
    } catch (e) { }
    return 0;
}

export function saveHighScore(score, key = TENTEN_STORAGE_KEYS.HIGH_SCORE) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(key, score.toString());
    } catch (e) { }
}

export function saveGameState(state, key = TENTEN_STORAGE_KEYS.SAVE_STATE) {
    try {
        localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
        console.warn('Gagal menyimpan state game:', e);
    }
}

export function loadGameState(key = TENTEN_STORAGE_KEYS.SAVE_STATE) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) {
        console.warn('Gagal memuat state game:', e);
        return null;
    }
}

export function clearGameState(key = TENTEN_STORAGE_KEYS.SAVE_STATE) {
    try {
        localStorage.removeItem(key);
    } catch (e) { }
}

// ── Memory Angka Storage Helpers ───────────────────────────

export function getMemoryUnlockedLevel() {
    if (typeof window === 'undefined') return 1;
    try {
        const raw = localStorage.getItem(MEMORY_STORAGE_KEYS.UNLOCKED_LEVEL);
        if (raw !== null) {
            return Math.max(1, parseInt(raw, 10) || 1);
        }
    } catch (e) { }
    return 1;
}

export function saveMemoryUnlockedLevel(level) {
    if (typeof window === 'undefined') return;
    try {
        const current = getMemoryUnlockedLevel();
        if (level > current) {
            localStorage.setItem(MEMORY_STORAGE_KEYS.UNLOCKED_LEVEL, level.toString());
        }
    } catch (e) { }
}

export function getMemoryLevelStars() {
    if (typeof window === 'undefined') return {};
    try {
        const raw = localStorage.getItem(MEMORY_STORAGE_KEYS.LEVEL_STARS);
        if (raw) return JSON.parse(raw) || {};
    } catch (e) { }
    return {};
}

export function saveMemoryLevelStars(level, stars) {
    if (typeof window === 'undefined') return;
    try {
        const data = getMemoryLevelStars();
        const current = data[level] || 0;
        if (stars > current) {
            data[level] = stars;
            localStorage.setItem(MEMORY_STORAGE_KEYS.LEVEL_STARS, JSON.stringify(data));
        }
    } catch (e) { }
}

export function getMemoryLevelScores() {
    if (typeof window === 'undefined') return {};
    try {
        const raw = localStorage.getItem(MEMORY_STORAGE_KEYS.LEVEL_SCORES);
        if (raw) return JSON.parse(raw) || {};
    } catch (e) { }
    return {};
}

export function saveMemoryLevelScore(level, score) {
    if (typeof window === 'undefined') return;
    try {
        const data = getMemoryLevelScores();
        const current = data[level] || 0;
        if (score > current) {
            data[level] = score;
            localStorage.setItem(MEMORY_STORAGE_KEYS.LEVEL_SCORES, JSON.stringify(data));
        }
    } catch (e) { }
}

export function getMemoryTotalStars() {
    const data = getMemoryLevelStars();
    return Object.values(data).reduce((sum, s) => sum + (Number(s) || 0), 0);
}

export function getMemoryTotalScore() {
    if (typeof window === 'undefined') return 0;
    try {
        const raw = localStorage.getItem(MEMORY_STORAGE_KEYS.TOTAL_SCORE);
        if (raw !== null) {
            return parseInt(raw, 10) || 0;
        }
        const scores = getMemoryLevelScores();
        return Object.values(scores).reduce((sum, s) => sum + (Number(s) || 0), 0);
    } catch (e) { }
    return 0;
}

export function saveMemoryTotalScore(score) {
    if (typeof window === 'undefined') return;
    try {
        const current = getMemoryTotalScore();
        if (score > current) {
            localStorage.setItem(MEMORY_STORAGE_KEYS.TOTAL_SCORE, score.toString());
        }
    } catch (e) { }
}
