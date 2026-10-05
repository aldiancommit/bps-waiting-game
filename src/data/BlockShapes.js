// Menggunakan 5 warna cerah dari Block Puzzle Kit agar sangat ramah untuk mata dan variatif
export const ACTIVE_COLORS = [
    { id: 'color-red', color: 0xef4444, useSprite: 'kit-red' },
    { id: 'color-blue', color: 0x3b82f6, useSprite: 'kit-blue' },
    { id: 'color-green', color: 0x22c55e, useSprite: 'kit-green' },
    { id: 'color-yellow', color: 0xeab308, useSprite: 'kit-yellow' },
    { id: 'color-purple', color: 0xc084fc, useSprite: 'kit-purple' }
];

// Semua warna tersedia
export const BLOCK_COLORS = [...ACTIVE_COLORS];

export const BLOCK_SHAPES = [
    // ── SMALL (1-2 Kotak) - Sangat mudah ──
    { cells: [[0, 0]], category: 'small' }, // Titik
    { cells: [[0, 0], [1, 0]], category: 'small' }, // Domino H
    { cells: [[0, 0], [0, 1]], category: 'small' }, // Domino V

    // ── MEDIUM (3 Kotak) ──
    // Bentuk L Kecil
    { cells: [[0, 0], [1, 0], [0, 1]], category: 'medium' },
    { cells: [[0, 0], [1, 0], [1, 1]], category: 'medium' },
    { cells: [[0, 0], [0, 1], [1, 1]], category: 'medium' },
    { cells: [[1, 0], [0, 1], [1, 1]], category: 'medium' },
    // Garis 3
    { cells: [[0, 0], [1, 0], [2, 0]], category: 'medium' },
    { cells: [[0, 0], [0, 1], [0, 2]], category: 'medium' },

    // ── LARGE (4 Kotak Max) - Agak menantang ──
    // Kotak 2x2
    { cells: [[0, 0], [1, 0], [0, 1], [1, 1]], category: 'large' },
    // Bentuk T Kecil
    { cells: [[0, 0], [1, 0], [2, 0], [1, 1]], category: 'large' }, // T Bawah
    { cells: [[1, 0], [0, 1], [1, 1], [2, 1]], category: 'large' }, // T Atas
    { cells: [[1, 0], [0, 1], [1, 1], [1, 2]], category: 'large' }, // T Kiri
    { cells: [[0, 0], [0, 1], [1, 1], [0, 2]], category: 'large' }, // T Kanan
    // Bentuk Zig-Zag (Z dan S)
    { cells: [[0, 0], [1, 0], [1, 1], [2, 1]], category: 'large' },
    { cells: [[1, 0], [2, 0], [0, 1], [1, 1]], category: 'large' },
    { cells: [[1, 0], [0, 1], [1, 1], [0, 2]], category: 'large' },
    { cells: [[0, 0], [0, 1], [1, 1], [1, 2]], category: 'large' },
    // Garis 4
    { cells: [[0, 0], [1, 0], [2, 0], [3, 0]], category: 'large' },
    { cells: [[0, 0], [0, 1], [0, 2], [0, 3]], category: 'large' }
];
