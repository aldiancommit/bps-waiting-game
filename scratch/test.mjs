import { BLOCK_SHAPES, ACTIVE_COLORS } from '../src/data/BlockShapes.js';

const GRID_SIZE = 10;
let board = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));

function _getSmartColor() {
    const boardColorsSet = new Set();
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (board[r][c] !== null) {
                boardColorsSet.add(board[r][c]);
            }
        }
    }
    const boardColors = Array.from(boardColorsSet);
    
    if (boardColors.length > 0 && Math.random() < 0.50) {
        const pickedColorHex = boardColors[Math.floor(Math.random() * boardColors.length)];
        const foundColor = ACTIVE_COLORS.find(colorObj => colorObj.color === pickedColorHex);
        if (foundColor) return foundColor;
    }
    
    return ACTIVE_COLORS[Math.floor(Math.random() * ACTIVE_COLORS.length)];
}

function spawnSlotPieces() {
    for (let i = 0; i < 3; i++) {
        const pool = BLOCK_SHAPES.filter(s => s.category === 'large');
        const baseShape = pool[Math.floor(Math.random() * pool.length)];
        
        const coloredCells = [];
        baseShape.cells.forEach(([c, r]) => {
            let smartColor;
            do {
                smartColor = _getSmartColor();
            } while (coloredCells.some(cell => cell[2].id === smartColor.id));
            
            coloredCells.push([c, r, smartColor]);
        });
        
        console.log("Spawned piece", i, coloredCells.map(c => c[2].id));
    }
}

try {
    spawnSlotPieces();
    console.log("Success");
} catch(e) {
    console.error(e);
}
