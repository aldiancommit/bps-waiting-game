/**
 * Block Shapes and Color Definitions for 1010 Block Puzzle.
 * Compact, board-friendly shapes optimized for high playtime and frequent color matches.
 */

export const ACTIVE_COLORS = [
    { id: 'color-red', color: 0xef4444, useSprite: 'kit-red' },
    { id: 'color-blue', color: 0x3b82f6, useSprite: 'kit-blue' },
    { id: 'color-green', color: 0x22c55e, useSprite: 'kit-green' },
    { id: 'color-yellow', color: 0xeab308, useSprite: 'kit-yellow' },
    { id: 'color-purple', color: 0xc084fc, useSprite: 'kit-purple' }
];

export const BLOCK_COLORS = [...ACTIVE_COLORS];

// 1-Cell (Dot)
export const POOL_1 = [
    [[0, 0]]
];

// 2-Cell (Dominoes)
export const POOL_2 = [
    [[0, 0], [1, 0]],
    [[0, 0], [0, 1]]
];

// 3-Cell (Trominoes: Lines & Corners)
export const POOL_3 = [
    [[0, 0], [1, 0], [2, 0]],
    [[0, 0], [0, 1], [0, 2]],
    [[0, 0], [1, 0], [0, 1]],
    [[0, 0], [1, 0], [1, 1]],
    [[0, 0], [0, 1], [1, 1]],
    [[1, 0], [0, 1], [1, 1]]
];

// 4-Cell (Compact Tetraminoes: 2x2 Square, Small T, Small L, 4-Lines)
export const POOL_4 = [
    // 2x2 Square
    [[0, 0], [1, 0], [0, 1], [1, 1]],
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
    // 4-Lines
    [[0, 0], [1, 0], [2, 0], [3, 0]],
    [[0, 0], [0, 1], [0, 2], [0, 3]]
];

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
    const all = [...POOL_1, ...POOL_2, ...POOL_3, ...POOL_4];
    return all.map(cells => ({
        cells,
        key: shapeKey(cells),
        size: cells.length
    }));
}

export const BLOCK_SHAPES = generateShapeCandidates();
