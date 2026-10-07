// Cells are occupied coordinates only; holes in the bounding box stay empty.
export const ACTIVE_COLORS = [
    { id: 'color-red', color: 0xef4444, useSprite: 'kit-red' },
    { id: 'color-blue', color: 0x3b82f6, useSprite: 'kit-blue' },
    { id: 'color-green', color: 0x22c55e, useSprite: 'kit-green' },
    { id: 'color-yellow', color: 0xeab308, useSprite: 'kit-yellow' },
    { id: 'color-purple', color: 0xc084fc, useSprite: 'kit-purple' }
];

export const BLOCK_COLORS = [...ACTIVE_COLORS];

const CLASSIC_SHAPES = [
    [[0, 0]], [[0, 0], [1, 0]],
    [[0, 0], [1, 0], [2, 0]], [[0, 0], [0, 1], [0, 2]],
    [[0, 0], [1, 0], [0, 1]], [[0, 0], [1, 0], [1, 1]],
    [[0, 0], [1, 0], [2, 0], [1, 1]],
    [[1, 0], [0, 1], [1, 1], [2, 1]],
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [0, 1], [1, 1]],
    [[0, 0], [0, 1], [0, 2], [0, 3]],
    [[0, 0], [1, 0], [2, 0], [3, 0]]
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

function categoryFor(size, complex, hollow) {
    if (hollow) return 'hollow';
    if (complex) return 'complex';
    if (size <= 2) return 'small';
    if (size <= 5) return 'medium';
    return 'large';
}

function isHollow(cells) {
    const points = new Set(cells.map(([x, y]) => `${x},${y}`));
    const maxX = Math.max(...cells.map(([x]) => x));
    const maxY = Math.max(...cells.map(([, y]) => y));
    for (let y = 1; y < maxY; y++) for (let x = 1; x < maxX; x++) {
        if (!points.has(`${x},${y}`)) return true;
    }
    return false;
}

function connected(cells) {
    const points = new Set(cells.map(([x, y]) => `${x},${y}`));
    const reached = new Set([points.values().next().value]);
    const queue = [...reached];
    while (queue.length) {
        const [x, y] = queue.pop().split(',').map(Number);
        for (const key of [`${x + 1},${y}`, `${x - 1},${y}`, `${x},${y + 1}`, `${x},${y - 1}`]) {
            if (points.has(key) && !reached.has(key)) { reached.add(key); queue.push(key); }
        }
    }
    return reached.size === cells.length;
}

function proceduralShape(random, maxCells = 5) {
    const cells = [[0, 0]];
    const points = new Set(['0,0']);
    const target = 4 + Math.floor(random() * Math.max(1, maxCells - 3));
    for (let attempts = 0; cells.length < target && attempts < target * 12; attempts++) {
        const [x, y] = cells[Math.floor(random() * cells.length)];
        const [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(random() * 4)];
        const nx = x + dx, ny = y + dy, key = `${nx},${ny}`;
        if (!points.has(key) && nx >= -3 && nx <= 3 && ny >= -3 && ny <= 3) {
            points.add(key); cells.push([nx, ny]);
        }
    }
    return normalizeShape(cells);
}

export function generateShapeCandidates(random = Math.random, maxCells = 5) {
    const candidates = new Map();
    const add = (cells, source, complex = false) => {
        if (cells.length > maxCells || !connected(cells)) return;
        const normalized = normalizeShape(cells);
        const key = shapeKey(normalized);
        if (candidates.has(key)) return;
        const hollow = isHollow(normalized);
        candidates.set(key, {
            key, cells: normalized,
            category: categoryFor(normalized.length, complex, hollow),
            source
        });
    };

    CLASSIC_SHAPES.forEach(cells => add(cells, 'classic'));
    // A compact hollow and branch shape add variety without making the tray bulky.
    add([[0,0],[1,0],[2,0],[0,1],[2,1]], 'hollow');
    add([[0,0],[1,0],[2,0],[1,1],[1,2]], 'branch');
    add([[0,0],[1,0],[2,0],[0,1],[0,2]], 'unique', true);
    add([[0,0],[1,0],[2,0],[1,1],[2,1]], 'unique', true);
    for (let i = 0; i < 2; i++) add(proceduralShape(random, maxCells), 'procedural', true);
    return [...candidates.values()];
}

// Backward-compatible export; actual generation is procedural and board-aware.
export const BLOCK_SHAPES = generateShapeCandidates();
