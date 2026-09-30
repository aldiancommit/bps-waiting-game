/**
 * LocalStorage management for 1010 Block Puzzle.
 */

import { STORAGE_KEYS } from './Constants.js';

export function getHighScore() {
    return parseInt(localStorage.getItem(STORAGE_KEYS.HIGH_SCORE)) || 0;
}

export function saveHighScore(score) {
    localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, score.toString());
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
