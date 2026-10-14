/**
 * Game constants and design tokens for Memory Angka.
 * Reuses identical typography, palette, and spatial rules as Tenten.
 * Coordinate space: 360x640 logical pixels with High-DPI Camera zoom.
 */

export const DPR = typeof window !== 'undefined'
    ? Math.min(window.devicePixelRatio || 1, 3)
    : 1;

export const FONT_PIXEL = "'Public Pixel', monospace, sans-serif";
export const FONT_UI = "'Poppins', system-ui, -apple-system, sans-serif";

// Layout & Grid Bounds (360x640)
export const BOARD_AREA = {
    X: 18,
    Y: 144,
    WIDTH: 324,
    HEIGHT: 376
};

// Gameplay Rules
export const MAX_LIVES = 3;
export const MAX_COMBO = 5;
export const BASE_SCORE_PER_TAP = 100;
export const PEEK_DURATION_MS = 700;
export const WRONG_BLINK_MS = 600;

/**
 * Memorization duration formula in milliseconds:
 * showMs = clamp(2600 + 350 * numCount - 60 * (level - 1), 1200, 6000)
 */
export function calculateBaseShowMs(numCount, level) {
    const raw = 2600 + 350 * numCount - 60 * (level - 1);
    return Math.max(1200, Math.min(6000, raw));
}

// Storage Keys for Memory Angka
export const MEMORY_STORAGE_KEYS = {
    SCHEMA_VERSION: 'bps_game_memory_v1',
    UNLOCKED_LEVEL: 'bps_game_memory_unlocked',
    LEVEL_STARS: 'bps_game_memory_stars',
    LEVEL_SCORES: 'bps_game_memory_scores',
    TOTAL_SCORE: 'bps_game_memory_totalscore',
    DDA_DATA: 'bps_game_memory_dda',
    MUTED: 'bps_game_tenten_muted' // shared mute preference
};

// Theme Color Palette (Consistent with Tenten & BPS Design System)
export const C = {
    BG_BASE: 0xF1F5F9,

    // Tile States
    TILE_EMPTY: 0xe2e8f0,
    TILE_BORDER: 0xcbd5e1,
    TILE_HIDDEN: 0x0f172a, // Hitam polos pekat
    TILE_HIDDEN_BORDER: 0x334155,
    TILE_REVEALED: 0x0f172a, // Hitam polos pekat
    TILE_CORRECT: 0x16a34a,  // Green success
    TILE_WRONG: 0xef4444,    // Red error
    TILE_HINT: 0xf59e0b,     // Gold Amber hint
    
    // UI Elements
    CARD_BG: 0xffffff,
    CARD_BORDER: 0xd1d5db,
    PILL_BG: 0xffffff,
    PILL_BORDER: 0xe2e8f0,
    SCORE_VAL: '#1e293b',
    BEST_VAL: '#b45309',
    SUBTEXT: '#64748b',

    // Buttons
    BTN_BG: 0x3A5192,
    BTN_GREEN: 0x22c55e,
    BTN_RED: 0xf43f5e,
    BTN_AMBER: 0xf59e0b,
    BTN_DISABLED: 0x94a3b8,

    // Stars & Hearts
    HEART_ACTIVE: 0xef4444,
    HEART_LOST: 0xcbd5e1,
    STAR_GOLD: 0xfacc15,
    STAR_EMPTY: 0xd1d5db
};
