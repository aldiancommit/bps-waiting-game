/**
 * Block Shapes and Color Definitions for 1010 Block Puzzle (Tenten Match Color).
 * Dynamic Shape Pools: Starting Foundation Blocks, Savior Compact Blocks, and Limited Giant Blocks.
 */

export const ACTIVE_COLORS = [
    { id: 'color-red', color: 0xef4444, useSprite: 'kit-red' },
    { id: 'color-blue', color: 0x3b82f6, useSprite: 'kit-blue' },
    { id: 'color-green', color: 0x22c55e, useSprite: 'kit-green' },
    { id: 'color-yellow', color: 0xeab308, useSprite: 'kit-yellow' },
    { id: 'color-purple', color: 0xc084fc, useSprite: 'kit-purple' }
];

export const COLOR_RAINBOW = {
    id: 'color-rainbow',
    color: 0xffffff,
    isSpecial: 'rainbow'
};

export const COLOR_BOMB = {
    id: 'color-bomb',
    color: 0x1e293b,
    isSpecial: 'bomb'
};

export const BLOCK_COLORS = [...ACTIVE_COLORS];

// 1-Cell (Dot - Universal Gap Filler / Ultimate Savior)
export const POOL_1 = [
    [[0, 0]]
];

// 2-Cell (Dominoes - Foundation & Savior)
export const POOL_2 = [
    [[0, 0], [1, 0]],
    [[0, 0], [0, 1]]
];

// 3-Cell: Starting Lines (Foundation)
export const POOL_3_STARTING = [
    [[0, 0], [1, 0], [2, 0]],
    [[0, 0], [0, 1], [0, 2]]
];

// 3-Cell: Savior Corners (Compact Rescue)
export const POOL_3_SAVIOR = [
    [[0, 0], [1, 0], [0, 1]],
    [[0, 0], [1, 0], [1, 1]],
    [[0, 0], [0, 1], [1, 1]],
    [[1, 0], [0, 1], [1, 1]]
];

export const POOL_3 = [...POOL_3_STARTING, ...POOL_3_SAVIOR];

// 4-Cell: Starting Blocks (2x2 Square, 4-Lines)
export const POOL_4_STARTING = [
    [[0, 0], [1, 0], [0, 1], [1, 1]], // 2x2 Square
    [[0, 0], [1, 0], [2, 0], [3, 0]], // Horiz 4-Line
    [[0, 0], [0, 1], [0, 2], [0, 3]]  // Vert 4-Line
];

// 4-Cell: Savior Compact Blocks (T, L, Zig-Zag S/Z)
export const POOL_4_SAVIOR = [
    // Small T (4 rotations)
    [[0, 0], [1, 0], [2, 0], [1, 1]],
    [[1, 0], [0, 1], [1, 1], [2, 1]],
    [[0, 0], [0, 1], [0, 2], [1, 1]],
    [[1, 0], [1, 1], [1, 2], [0, 1]],
    // Small L (4 rotations)
    [[0, 0], [0, 1], [0, 2], [1, 2]],
    [[1, 0], [1, 1], [1, 2], [0, 2]],
    [[0, 0], [1, 0], [2, 0], [0, 1]],
    [[0, 0], [1, 0], [2, 0], [2, 1]],
    // Mini Zig-Zag S & Z
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
    [[1, 0], [0, 1], [1, 1], [0, 2]]
];

export const POOL_4 = [...POOL_4_STARTING, ...POOL_4_SAVIOR];

// 5-Cell: Savior Unique Compact Patterns
export const POOL_5_SAVIOR = [
    // Plus / Cross
    [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]],
    // U-Shapes (4 rotations)
    [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
    [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1]],
    [[0, 0], [0, 1], [0, 2], [1, 0], [1, 2]],
    [[0, 0], [0, 2], [1, 0], [1, 1], [1, 2]],
    // Mini Stair / Diagonal (2 rotations)
    [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]],
    [[2, 0], [1, 0], [1, 1], [0, 1], [0, 2]]
];

// 5-Cell & 9-Cell: Giant Blocks (STRICTLY LIMITED)
export const POOL_5_GIANT = [
    // 5-Lines
    [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
    [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
    // Big 3x3 Corner
    [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2]],
    [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]],
    [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]],
    [[2, 0], [2, 1], [2, 2], [0, 2], [1, 2]],
    // 3x3 Solid Square (Giant 9-cell)
    [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]]
];

export const POOL_5 = [...POOL_5_SAVIOR, ...POOL_5_GIANT];

export function normalizeShape(cells) {
    const minX = Math.min(...cells.map(([x]) => x));
    const minY = Math.min(...cells.map(([, y]) => y));
    return cells.map(([x, y]) => [x - minX, y - minY])
        .sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

export function shapeKey(cells) {
    const normalized = normalizeShape(cells);
    const rotations = [];
    let rotated = normalized;
    for (let i = 0; i < 4; i++) {
        rotations.push(normalizeShape(rotated).map(([x, y]) => `${x},${y}`).join(';'));
        rotated = rotated.map(([x, y]) => [-y, x]);
    }
    return rotations.sort()[0];
}

export function generateShapeCandidates() {
    const all = [...POOL_1, ...POOL_2, ...POOL_3, ...POOL_4, ...POOL_5];
    return all.map(cells => ({
        cells,
        key: shapeKey(cells),
        size: cells.length
    }));
}

export const BLOCK_SHAPES = generateShapeCandidates();
