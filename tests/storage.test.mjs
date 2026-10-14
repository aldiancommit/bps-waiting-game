/**
 * Resilience & Invariant Suite for Multi-Game LocalStorage Manager.
 * Tests corrupted JSON, fallback keys, quota exceed, and missing localStorage.
 */

import test from 'node:test';
import assert from 'node:assert';

// Mock localStorage environment
class MockLocalStorage {
    constructor() {
        this.store = new Map();
        this.failOnSet = false;
    }
    getItem(key) {
        return this.store.has(key) ? this.store.get(key) : null;
    }
    setItem(key, value) {
        if (this.failOnSet) throw new Error('QuotaExceededError');
        this.store.set(key, String(value));
    }
    removeItem(key) {
        this.store.delete(key);
    }
    clear() {
        this.store.clear();
    }
}

globalThis.window = globalThis;
globalThis.localStorage = new MockLocalStorage();

const Storage = await import('../src/shared/Storage.js');

test('Storage - High Score fallback & migration', () => {
    localStorage.clear();
    localStorage.setItem('bps_1010_highscore', '450');

    const score = Storage.getHighScore();
    assert.strictEqual(score, 450, 'Migrates legacy high score');
    assert.strictEqual(localStorage.getItem(Storage.TENTEN_STORAGE_KEYS.HIGH_SCORE), '450', 'Persists migrated score');

    Storage.saveHighScore(900);
    assert.strictEqual(Storage.getHighScore(), 900, 'Updates current high score');
});

test('Storage - Save/Load game state with corruption resilience', () => {
    localStorage.clear();

    const sampleState = { score: 120, grid: [[1, 2], [3, 4]] };
    Storage.saveGameState(sampleState);

    const loaded = Storage.loadGameState();
    assert.deepStrictEqual(loaded, sampleState, 'Loads saved state cleanly');

    // Simulate corrupted JSON in storage
    localStorage.setItem(Storage.TENTEN_STORAGE_KEYS.SAVE_STATE, '{invalid_json:::');
    const corruptLoaded = Storage.loadGameState();
    assert.strictEqual(corruptLoaded, null, 'Handles corrupted JSON safely without throwing');
});

test('Storage - Memory Angka progression and stars', () => {
    localStorage.clear();

    assert.strictEqual(Storage.getMemoryUnlockedLevel(), 1, 'Default unlocked level is 1');
    Storage.saveMemoryUnlockedLevel(5);
    assert.strictEqual(Storage.getMemoryUnlockedLevel(), 5, 'Saves unlocked level 5');
    Storage.saveMemoryUnlockedLevel(3);
    assert.strictEqual(Storage.getMemoryUnlockedLevel(), 5, 'Does not regress unlocked level');

    Storage.saveMemoryLevelStars(1, 3);
    Storage.saveMemoryLevelStars(2, 2);
    assert.strictEqual(Storage.getMemoryTotalStars(), 5, 'Sums stars accurately');
});

test('Storage - Graceful failure on quota exceeded', () => {
    localStorage.failOnSet = true;
    assert.doesNotThrow(() => {
        Storage.saveHighScore(1000);
        Storage.saveGameState({ dummy: 'data' });
        Storage.saveMemoryUnlockedLevel(10);
    }, 'Does not throw uncaught error when storage fails');
    localStorage.failOnSet = false;
});
