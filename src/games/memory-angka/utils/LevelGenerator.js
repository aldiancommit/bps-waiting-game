/**
 * Smart Best-of-K Level Generator for Memory Angka.
 * Pure mathematical layout generator with heuristic difficulty scoring.
 * 100% deterministic per (levelId, attemptSalt), zero runtime allocation in game loop.
 */

import { Mulberry32, hashInts } from './Rng.js';

export function calculateLayoutHeuristic(cells, cols, rows) {
    // cells: array of { index, col, row, value } sorted by value (1..N)
    const n = cells.length;
    if (n <= 1) return 0.5;

    const maxDiag = Math.hypot(cols - 1, rows - 1) || 1;

    // 1. Normalized consecutive distance (n to n+1)
    let totalConsecutiveDist = 0;
    for (let i = 0; i < n - 1; i++) {
        const d = Math.hypot(cells[i + 1].col - cells[i].col, cells[i + 1].row - cells[i].row);
        totalConsecutiveDist += d;
    }
    const avgConsecutiveDistNorm = (totalConsecutiveDist / (n - 1)) / maxDiag;

    // 2. Spatial dispersion (standard deviation of positions)
    const meanCol = cells.reduce((sum, c) => sum + c.col, 0) / n;
    const meanRow = cells.reduce((sum, c) => sum + c.row, 0) / n;
    let varSum = 0;
    for (const c of cells) {
        varSum += Math.hypot(c.col - meanCol, c.row - meanRow) ** 2;
    }
    const dispersionNorm = Math.min(1.0, Math.sqrt(varSum / n) / (maxDiag / 2));

    // 3. Penalty for trivial patterns
    let trivialPenalty = 0;
    
    // Check consecutive col/row monotonicity (row-major order)
    let monotonicCount = 0;
    for (let i = 0; i < n - 1; i++) {
        const c1 = cells[i], c2 = cells[i + 1];
        if ((c2.row === c1.row && c2.col === c1.col + 1) || (c2.row === c1.row + 1 && c2.col === 0)) {
            monotonicCount++;
        }
    }
    trivialPenalty += (monotonicCount / (n - 1)) * 0.35;

    // Check collinear runs (3+ consecutive in same row or col)
    let collinearRun = 0;
    for (let i = 0; i < n - 2; i++) {
        const c1 = cells[i], c2 = cells[i + 1], c3 = cells[i + 2];
        if ((c1.row === c2.row && c2.row === c3.row) || (c1.col === c2.col && c2.col === c3.col)) {
            collinearRun++;
        }
    }
    trivialPenalty += (collinearRun / Math.max(1, n - 2)) * 0.25;

    // Raw difficulty metric in [0, 1]
    const rawDifficulty = (avgConsecutiveDistNorm * 0.55 + dispersionNorm * 0.45) - trivialPenalty;
    return Math.max(0.05, Math.min(0.98, rawDifficulty));
}

export function layoutSignature(cells) {
    let sig = 0;
    for (let i = 0; i < cells.length; i++) {
        sig = hashInts(sig, cells[i].index, cells[i].value);
    }
    return sig >>> 0;
}

/**
 * Generates a verified, solvable layout for a given level config.
 */
export function generateLevelLayout(config, attemptSalt = 0, previousSignature = 0) {
    const { level, cols, rows, numCount, targetDifficulty = 0.5 } = config;
    const totalCells = cols * rows;

    if (numCount > totalCells) {
        throw new Error(`Invalid level config: numCount (${numCount}) > totalCells (${totalCells})`);
    }

    const K = 8; // Best-of-8 candidate evaluation
    let bestCandidate = null;
    let bestDelta = Infinity;

    for (let retry = 0; retry < 10; retry++) {
        const seed = hashInts(level, attemptSalt, retry);
        const rng = new Mulberry32(seed);

        for (let k = 0; k < K; k++) {
            // Pick numCount unique cell indices using Fisher-Yates
            const allIndices = Array.from({ length: totalCells }, (_, i) => i);
            rng.shuffle(allIndices);
            const chosenIndices = allIndices.slice(0, numCount);

            // Assign values 1..numCount (can be shuffled or mapped)
            const values = Array.from({ length: numCount }, (_, i) => i + 1);
            rng.shuffle(values);

            const candidateCells = chosenIndices.map((idx, i) => ({
                index: idx,
                col: idx % cols,
                row: Math.floor(idx / cols),
                value: values[i]
            })).sort((a, b) => a.value - b.value);

            const signature = layoutSignature(candidateCells);
            if (signature === previousSignature && retry < 8) {
                continue; // Avoid repeating exact previous layout
            }

            const difficulty = calculateLayoutHeuristic(candidateCells, cols, rows);
            const delta = Math.abs(difficulty - targetDifficulty);

            if (delta < bestDelta) {
                bestDelta = delta;
                bestCandidate = {
                    cells: candidateCells,
                    difficulty,
                    signature,
                    cols,
                    rows,
                    numCount,
                    level
                };
            }
        }

        if (bestCandidate && bestDelta < 0.12) {
            break;
        }
    }

    return bestCandidate;
}
