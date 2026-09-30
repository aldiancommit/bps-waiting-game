/**
 * Game constants for 1010 Block Puzzle.
 * Neumorphic Dark Mode layout — 360×640 canvas.
 */

export const GRID_SIZE = 10;
export const CELL_SIZE = 27;
export const CELL_GAP = 3;
export const GRID_STEP = CELL_SIZE + CELL_GAP; // 30px per cell → Board 300×300px

// Board panel: 320×320px centered at x=20, y=118
export const BOARD_X = 20;
export const BOARD_Y = 118;
export const BOARD_W = 320;
export const BOARD_H = 320;
export const BOARD_RADIUS = 18;

// Grid inner origin (with padding inside the panel)
export const GRID_START_X = BOARD_X + 10; // 30
export const GRID_START_Y = BOARD_Y + 10; // 128

// UX: finger offset so block floats above thumb during drag
export const FINGER_OFFSET_Y = -72;

// 3 Bottom Slot Cards
export const SLOT_CONFIG = [
    { x: 67,  y: 518, boxX: 20,  boxY: 468, width: 94, height: 94 },
    { x: 180, y: 518, boxX: 133, boxY: 468, width: 94, height: 94 },
    { x: 293, y: 518, boxX: 246, boxY: 468, width: 94, height: 94 }
];
export const SLOT_SCALE = 0.52;

export const STORAGE_KEYS = {
    HIGH_SCORE: 'bps_1010_highscore',
    SAVE_STATE: 'bps_1010_savestate'
};

// Inter for clean UI text; Press Start 2P loaded in index.html but used via Phaser text configs
export const FONT_INTER  = "'Inter', system-ui, sans-serif";
export const FONT_RETRO  = "'Press Start 2P', monospace";

// Colour tokens
export const C = {
    // Background layers
    BG_BASE:        0x0f1626,
    BG_PANEL:       0x151e33,

    // Board neumorphic layers
    BOARD_OUTER:    0x1b2540,  // bevel outer panel
    BOARD_SHADOW_D: 0x090d18,  // inset dark shadow (top-left)
    BOARD_LIGHT_H:  0x2a3860,  // inset highlight (bottom-right)
    BOARD_INNER:    0x111827,  // dark inner floor
    CELL_EMPTY:     0x0e1520,  // empty cell fill
    CELL_BORDER:    0x1e2d47,  // empty cell border

    // Header pills
    PILL_BG:        0x1b2540,
    PILL_BORDER:    0x2a3e62,
    PILL_LABEL:     0x4a6080,
    SCORE_VAL:      0xe2e8f0,
    BEST_LABEL:     0xf59e0b,

    // Slot cards
    SLOT_BG:        0x1b2540,
    SLOT_BORDER:    0x2a3e62,

    // Game over overlay
    OVERLAY_DIM:    0x000000,
    CARD_BG:        0x1b2540,
    CARD_BORDER:    0x22d3ee,
    BTN_BG:         0x0891b2,
    BTN_BORDER:     0x22d3ee,
};
