/**
 * LocalStorage management for 1010 Block Puzzle.
 */

import { STORAGE_KEYS } from './Constants.js';

export function getHighScore() {
    if (typeof window === 'undefined') return 0;
    try {
        const current = localStorage.getItem(STORAGE_KEYS.HIGH_SCORE);
        if (current !== null) {
            return parseInt(current, 10) || 0;
        }
        // Legacy fallback
        const legacy = localStorage.getItem('bps_1010_highscore');
        if (legacy !== null) {
            const val = parseInt(legacy, 10) || 0;
            localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, val.toString());
            return val;
        }
    } catch (e) { }
    return 0;
}

export function saveHighScore(score) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, score.toString());
    } catch (e) { }
}

export function saveGameState(state) {
    try {
        localStorage.setItem(STORAGE_KEYS.SAVE_STATE, JSON.stringify(state));
    } catch (e) {
        console.warn('Gagal menyimpan state game:', e);
    }
}

export function loadGameState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.SAVE_STATE);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) {
        console.warn('Gagal memuat state game:', e);
        return null;
    }
}

export function clearGameState() {
    localStorage.removeItem(STORAGE_KEYS.SAVE_STATE);
}
