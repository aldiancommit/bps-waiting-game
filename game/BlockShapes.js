/**
 * Block shape definitions — Neon / Flat vibrant palette.
 * Contrasts crisply against the dark neumorphic board.
 */

// Neon palette
const CYAN   = 0x06b6d4; // Neon Cyan
const LIME   = 0x84cc16; // Lime Green
const YELLOW = 0xfacc15; // Bright Yellow
const RED    = 0xf43f5e; // Retro Red/Rose
const PURPLE = 0xa855f7; // Vivid Purple
const ORANGE = 0xfb923c; // Neon Orange
const MINT   = 0x34d399; // Mint Green
const INDIGO = 0x818cf8; // Soft Indigo

export const BLOCK_SHAPES = [
    // ── 1-cell ──────────────────────────────────────────
    { cells: [[0, 0]], color: CYAN },

    // ── 2-cell (dominoes) ───────────────────────────────
    { cells: [[0, 0], [1, 0]], color: ORANGE },
    { cells: [[0, 0], [0, 1]], color: ORANGE },

    // ── 3-cell lines ────────────────────────────────────
    { cells: [[0, 0], [1, 0], [2, 0]], color: LIME },
    { cells: [[0, 0], [0, 1], [0, 2]], color: LIME },

    // ── 3-cell L-shapes (2×2 corners) ───────────────────
    { cells: [[0, 0], [1, 0], [0, 1]], color: PURPLE },
    { cells: [[0, 0], [1, 0], [1, 1]], color: PURPLE },
    { cells: [[0, 0], [0, 1], [1, 1]], color: PURPLE },
    { cells: [[1, 0], [0, 1], [1, 1]], color: PURPLE },

    // ── 4-cell lines ────────────────────────────────────
    { cells: [[0, 0], [1, 0], [2, 0], [3, 0]], color: CYAN },
    { cells: [[0, 0], [0, 1], [0, 2], [0, 3]], color: CYAN },

    // ── 4-cell square (2×2) ─────────────────────────────
    { cells: [[0, 0], [1, 0], [0, 1], [1, 1]], color: YELLOW },

    // ── 5-cell lines ────────────────────────────────────
    { cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], color: RED },
    { cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], color: RED },

    // ── Big L-shapes (3×3 corners, 5 cells) ─────────────
    { cells: [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2]], color: MINT },
    { cells: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]], color: MINT },
    { cells: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]], color: MINT },
    { cells: [[2, 0], [2, 1], [0, 2], [1, 2], [2, 2]], color: MINT },

    // ── 9-cell (3×3 square) ─────────────────────────────
    { cells: [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]], color: INDIGO },
];
