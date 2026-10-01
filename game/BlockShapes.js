/**
 * Block shape definitions — Neon / Flat vibrant palette.
 * Contrasts crisply against the dark neumorphic board.
 */

// [TAG: PALET WARNA BALOK]
// Silakan ganti warna balok sesuai keinginan di sini (gunakan 0x sebagai pengganti #)
const CYAN   = 0x06b6d4; // Cyan Siber
const LIME   = 0x84cc16; // Hijau Lime
const YELLOW = 0xfacc15; // Kuning Terang
const RED    = 0xf43f5e; // Merah Retro
const PURPLE = 0xa855f7; // Ungu Terang
const ORANGE = 0xfb923c; // Oranye Neon
const MINT   = 0x34d399; // Hijau Mint
const INDIGO = 0x818cf8; // Indigo Lembut

// [TAG: DAFTAR BENTUK DAN WARNA MASING-MASING BALOK]
export const BLOCK_SHAPES = [
    // ── 1-cell (1 kotak) ────────────────────────────────────
    { cells: [[0, 0]], color: CYAN },

    // ── 2-cell (domino / 2 kotak) ───────────────────────────
    { cells: [[0, 0], [1, 0]], color: ORANGE },
    { cells: [[0, 0], [0, 1]], color: ORANGE },

    // ── 3-cell lines (garis 3 kotak) ────────────────────────
    { cells: [[0, 0], [1, 0], [2, 0]], color: LIME },
    { cells: [[0, 0], [0, 1], [0, 2]], color: LIME },

    // ── 3-cell L-shapes (Bentuk L 3 kotak) ──────────────────
    { cells: [[0, 0], [1, 0], [0, 1]], color: PURPLE },
    { cells: [[0, 0], [1, 0], [1, 1]], color: PURPLE },
    { cells: [[0, 0], [0, 1], [1, 1]], color: PURPLE },
    { cells: [[1, 0], [0, 1], [1, 1]], color: PURPLE },

    // ── 4-cell lines (garis 4 kotak) ────────────────────────
    { cells: [[0, 0], [1, 0], [2, 0], [3, 0]], color: CYAN },
    { cells: [[0, 0], [0, 1], [0, 2], [0, 3]], color: CYAN },

    // ── 4-cell square (Kotak persegi 2x2) ───────────────────
    { cells: [[0, 0], [1, 0], [0, 1], [1, 1]], color: YELLOW },

    // ── 5-cell lines (Garis panjang 5 kotak) ────────────────
    { cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], color: RED },
    { cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], color: RED },

    // ── Big L-shapes (Bentuk L Besar 5 kotak) ───────────────
    { cells: [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2]], color: MINT },
    { cells: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]], color: MINT },
    { cells: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]], color: MINT },
    { cells: [[2, 0], [2, 1], [0, 2], [1, 2], [2, 2]], color: MINT },

    // ── 9-cell (Kotak besar 3x3) ────────────────────────────
    { cells: [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]], color: INDIGO },
];
