/**
 * Game constants for 1010 Block Puzzle.
 * Clean White Theme — Glossy Blocks
 *
 * All spatial values are in logical pixels (360×640 coordinate space).
 * High-DPI rendering is handled by camera zoom — no manual DPR scaling needed here.
 */

export const DPR = typeof window !== 'undefined'
    ? Math.min(window.devicePixelRatio || 1, 3)
    : 1;

// [TAG: PENGATURAN KOTAK GRID]
export const GRID_SIZE = 10;     // Jumlah grid (10x10)
export const CELL_SIZE = 31;     // Ukuran fisik 1 kotak grid (pixel)
export const CELL_GAP = 4;       // Jarak spasi antar kotak (pixel)
export const GRID_STEP = CELL_SIZE + CELL_GAP; // Total ukuran per sel

// [TAG: PENGATURAN UKURAN DAN POSISI PAPAN]
export const BOARD_X = 7;        // Posisi papan dari kiri (X) - simetris di layar 360px
export const BOARD_Y = 142;      // Posisi papan dari atas (Y) - diturunkan memberi ruang header atas luas bagi logo BPS
export const BOARD_W = 346;      // Lebar total papan (10*31 + 9*4)
export const BOARD_H = 346;      // Tinggi total papan

// Grid inner origin
export const GRID_START_X = BOARD_X;
export const GRID_START_Y = BOARD_Y;

// [TAG: PENGATURAN UX SENTUHAN (TOUCH)]
// Balok dinaikkan lebih tinggi (-85px) saat di-hold agar tidak tertutup jempol dan mudah dilihat di layar HP
export const FINGER_OFFSET_Y = -85;

// [TAG: PENGATURAN 3 BALOK PILIHAN (SLOT BAWAH)]
export const SLOT_CONFIG = [
    { x: 65, y: 550, boxX: 15, boxY: 502, width: 100, height: 96 },
    { x: 180, y: 550, boxX: 130, boxY: 502, width: 100, height: 96 },
    { x: 295, y: 550, boxX: 245, boxY: 502, width: 100, height: 96 }
];
// [TAG: SKALA BALOK DI SLOT]
export const SLOT_SCALE = 0.52;

export const STORAGE_KEYS = {
    HIGH_SCORE: 'bps_game_tenten_highscore',
    SAVE_STATE: 'bps_game_tenten_savestate',
    MUTED: 'bps_game_tenten_muted'
};

// [TAG: FONT]
export const FONT_PIXEL = "'Public Pixel', sans-serif";
export const FONT_UI = "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

// [TAG: PENGATURAN TEMA WARNA UTAMA]
export const C = {
    // [TAG: WARNA BACKGROUND]
    BG_BASE: 0xF1F5F9,

    // [TAG: WARNA PAPAN GRID — abu-abu terang, tidak gelap]
    CELL_EMPTY: 0xe2e8f0,     // Abu-abu terang untuk kotak kosong
    CELL_BORDER: 0xd1d5db,    // Border kotak lebih halus

    // [TAG: WARNA KOTAK HEADER & SLOT]
    PILL_BG: 0xffffff,
    SCORE_VAL: '#1e293b',     // Teks skor — gelap
    BEST_VAL: '#b45309',      // Teks best — emas gelap

    // [TAG: WARNA POPUP GAME OVER & PAUSE]
    CARD_BG: 0xffffff,
    CARD_BORDER: 0xd1d5db,
    BTN_BG: 0x3A5192,
    BTN_GREEN: 0x22c55e,
    BTN_RED: 0xf43f5e,
};
