/**
 * Game constants for 1010 Block Puzzle.
 * Pixel Art Theme — Flat Clean
 */

// [TAG: PENGATURAN KOTAK GRID]
export const GRID_SIZE = 10;     // Jumlah grid (10x10)
export const CELL_SIZE = 31;     // Ukuran fisik 1 kotak grid (pixel)
export const CELL_GAP = 3;       // Jarak spasi antar kotak (pixel)
export const GRID_STEP = CELL_SIZE + CELL_GAP; // Total ukuran per sel

// [TAG: PENGATURAN UKURAN DAN POSISI PAPAN]
export const BOARD_X = 10;       // Posisi papan dari kiri (X)
export const BOARD_Y = 118;      // Posisi papan dari atas (Y)
export const BOARD_W = 340;      // Lebar total papan
export const BOARD_H = 340;      // Tinggi total papan

// Grid inner origin
export const GRID_START_X = BOARD_X;
export const GRID_START_Y = BOARD_Y;

// [TAG: PENGATURAN UX SENTUHAN (TOUCH)]
export const FINGER_OFFSET_Y = -55;

// [TAG: PENGATURAN 3 BALOK PILIHAN (SLOT BAWAH)]
export const SLOT_CONFIG = [
    { x: 67, y: 530, boxX: 20, boxY: 480, width: 94, height: 94 },
    { x: 180, y: 530, boxX: 133, boxY: 480, width: 94, height: 94 },
    { x: 293, y: 530, boxX: 246, boxY: 480, width: 94, height: 94 }
];
// [TAG: SKALA BALOK DI SLOT]
export const SLOT_SCALE = 0.52;

export const STORAGE_KEYS = {
    HIGH_SCORE: 'bps_1010_highscore',
    SAVE_STATE: 'bps_1010_savestate'
};

// [TAG: FONT]
export const FONT_PIXEL = "'Press Start 2P', monospace";
export const FONT_POPPINS = "'Poppins', system-ui, sans-serif";
export const FONT_RETRO = "'Press Start 2P', monospace";

// [TAG: PENGATURAN TEMA WARNA UTAMA]
export const C = {
    // [TAG: WARNA BACKGROUND]
    BG_BASE: 0xF1F5F9,

    // [TAG: WARNA PAPAN GRID]
    CELL_EMPTY: 0xe2e8f0, // Warna kotak kosong abu-abu terang

    // [TAG: WARNA KOTAK HEADER & SLOT]
    PILL_BG: 0xffffff,
    PILL_LABEL: 0x64748b,
    SCORE_VAL: 0x3A5192,
    BEST_LABEL: 0xf59e0b,

    // [TAG: WARNA POPUP GAME OVER]
    OVERLAY_DIM: 0xffffff,
    CARD_BG: 0xffffff,
    CARD_BORDER: 0x3A5192,
    BTN_BG: 0x3A5192,
    BTN_BORDER: 0x6B82C4,
};
