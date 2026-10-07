import Phaser from 'phaser';
import { ACTIVE_COLORS, POOL_1, POOL_2, POOL_3, POOL_4, POOL_5, shapeKey } from '../data/BlockShapes.js';
import {
    DPR,
    GRID_SIZE, CELL_SIZE, CELL_GAP, GRID_STEP,
    GRID_START_X, GRID_START_Y,
    BOARD_X, BOARD_Y, BOARD_W, BOARD_H,
    FINGER_OFFSET_Y,
    SLOT_CONFIG, SLOT_SCALE,
    FONT_PIXEL,
    C
} from '../utils/Constants.js';
import { RetroAudio, triggerHaptic } from '../utils/Audio.js';
import {
    getHighScore, saveHighScore,
    clearGameState
} from '../utils/Storage.js';

export class BlockPuzzleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BlockPuzzleScene' });
        this.audio = new RetroAudio();
    }

    preload() {
        this.load.image('mahkota', '/assets/mahkota-icon.png');
        this.load.image('pause', '/assets/pause.png');
        
        const kitPath = '/assets/block-puzzle-kit/addons/block_puzzle_kit/art/glossy/hd';
        this.load.image('kit-red', `${kitPath}/red.webp`);
        this.load.image('kit-blue', `${kitPath}/blue.webp`);
        this.load.image('kit-green', `${kitPath}/green.webp`);
        this.load.image('kit-yellow', `${kitPath}/yellow.webp`);
        this.load.image('kit-purple', `${kitPath}/purple.webp`);
        
        const particlePath = '/assets/block-puzzle-kit/addons/block_puzzle_kit/art/particles';
        this.load.image('pt-sparkle', `${particlePath}/sparkle.webp`);
        this.load.image('pt-glow', `${particlePath}/glow.webp`);
    }

    create() {
        const maskG = this.make.graphics();
        maskG.fillStyle(0xffffff, 1);
        maskG.fillRoundedRect(0, 0, CELL_SIZE, CELL_SIZE, 5);
        maskG.generateTexture('cell-mask', CELL_SIZE, CELL_SIZE);
        maskG.destroy();

        this.score = 0;
        this.highScore = getHighScore();
        this.isGameOver = false;
        this.isPaused = false;
        this.comboStreak = 0;

        this.activeDragPiece = null;
        this.activeDragSlot = null;
        this.activePointerId = null;
        this.lastGhostKey = null;

        this.board = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
        // Parallel board tracking which cells use sprite rendering
        this.boardSprite = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));

        this.slotPieces = [null, null, null];
        this.slotContainers = [null, null, null];

        this._buildBackground();
        this._buildHeader();
        this._buildBoard();
        this._buildSlotCards();
        this._buildGhostLayer();
        this._buildGameOverOverlay();
        this._buildPauseOverlay();
        this._setupInput();

        clearGameState();
        this.spawnSlotPieces();
        this._syncScoreUI();
    }

    // ── Background ──────────────────────────────────────────

    _buildBackground() {
        const g = this.add.graphics();
        g.fillStyle(C.BG_BASE, 1);
        g.fillRect(0, 0, 360, 640);
    }

    // ── Header: Score — Crown — Best — Pause ────────────────

    _buildHeader() {
        const centerY = 65;

        // Score label
        // this.add.text(95, centerY - 18, 'SCORE', {
        //     fontFamily: FONT_PIXEL, fontSize: '6px',
        //     color: '#94a3b8'
        // }).setOrigin(0.5, 0.5).setResolution(4);

        // Skor (kiri)
        this.scoreValueText = this.add.text(95, centerY + 6, '0', {
            fontFamily: FONT_PIXEL, fontSize: '20px',
            color: C.SCORE_VAL
        }).setOrigin(0.5, 0.5).setResolution(4);

        // Mahkota (tengah)
        this.crownIcon = this.add.image(180, centerY, 'mahkota')
            .setScale(0.06)
            .setOrigin(0.5, 0.5);

        // Best label
        // this.add.text(275, centerY - 18, 'BEST', {
        //     fontFamily: FONT_PIXEL, fontSize: '6px',
        //     color: '#94a3b8'
        // }).setOrigin(0.5, 0.5).setResolution(4);

        // Skor Terbaik (kanan)
        this.highScoreValueText = this.add.text(275, centerY + 6, `${this.highScore}`, {
            fontFamily: FONT_PIXEL, fontSize: '20px',
            color: C.BEST_VAL
        }).setOrigin(0.5, 0.5).setResolution(4);

        // Pause button (pojok kanan atas)
        this.pauseBtn = this.add.image(300, -12, 'pause')
            .setScale(0.028)
            .setOrigin(0, 0)
            .setInteractive({ useHandCursor: true })
            .setDepth(10);

        this.pauseBtn.on('pointerdown', () => {
            if (!this.isGameOver && !this.isPaused) this._togglePause(true);
        });
    }

    // ── Board 10×10 — abu-abu terang, bukan kit gelap ───────

    _buildBoard() {
        this.boardCellGraphics = this.add.graphics();
        
        const maskG = this.make.graphics();
        maskG.fillStyle(0xffffff, 1);
        
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const cx = GRID_START_X + c * GRID_STEP;
                const cy = GRID_START_Y + r * GRID_STEP;
                // Kotak kosong abu-abu terang
                this.boardCellGraphics.fillStyle(C.CELL_EMPTY, 1);
                this.boardCellGraphics.fillRoundedRect(cx, cy, CELL_SIZE, CELL_SIZE, 5);
                // Border halus
                this.boardCellGraphics.lineStyle(1, C.CELL_BORDER, 0.5);
                this.boardCellGraphics.strokeRoundedRect(cx, cy, CELL_SIZE, CELL_SIZE, 5);
                
                // Add to static mask
                maskG.fillRoundedRect(cx, cy, CELL_SIZE, CELL_SIZE, 5);
            }
        }

        this.boardFillGraphics = this.add.graphics();
        // Container for sprite-based board cells (crop-blok images on the board)
        this.boardSpriteContainer = this.add.container(0, 0).setDepth(1);
        this.add.existing(maskG);
        maskG.setAlpha(0);
        this.boardSpriteContainer.setMask(maskG.createGeometryMask());
    }

    _renderBoardFills() {
        this.boardFillGraphics.clear();
        // Destroy old sprite images on board
        this.boardSpriteContainer.removeAll(true);

        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const color = this.board[r][c];
                if (color !== null) {
                    const x = GRID_START_X + c * GRID_STEP;
                    const y = GRID_START_Y + r * GRID_STEP;

                    if (this.boardSprite[r][c]) {
                        // Render as sprite cell from crop-blok
                        this._drawSpriteBoardCell(x, y, this.boardSprite[r][c]);
                    } else {
                        this._drawPixelCell(this.boardFillGraphics, x, y, color, 1);
                    }
                }
            }
        }
    }

    /**
     * Draw a single cell on the board using a sprite.
     */
    _drawSpriteBoardCell(x, y, spriteKey) {
        const img = this.add.image(x, y, spriteKey)
            .setOrigin(0, 0)
            .setDisplaySize(CELL_SIZE, CELL_SIZE);
        this.boardSpriteContainer.add(img);
    }

    // ── Slot Cards (3 pilihan balok bawah) ───────────────────

    _buildSlotCards() {
        // Background panel untuk slot
        const slotBg = this.add.graphics().setDepth(15);
        for (let i = 0; i < 3; i++) {
            const conf = SLOT_CONFIG[i];
            slotBg.fillStyle(0xf1f5f9, 1);
            slotBg.fillRoundedRect(conf.boxX, conf.boxY, conf.width, conf.height, 10);

            const zone = this.add.zone(conf.x, conf.y, conf.width, conf.height)
                .setInteractive({ useHandCursor: true })
                .setDepth(25);

            zone.on('pointerdown', (pointer) => {
                if (this.isGameOver || this.isPaused || this.activeDragPiece) return;
                const container = this.slotContainers[i];
                if (container) this._startDrag(container, i, pointer);
            });
        }
    }

    _buildGhostLayer() {
        this.ghostGraphics = this.add.graphics().setDepth(30).setVisible(false);
    }

    // ── Pixel Cell Renderer (dengan inner shadow) ───────────

    _drawPixelCell(g, x, y, color, alpha = 1) {
        g.fillStyle(color, alpha);
        g.fillRoundedRect(x, y, CELL_SIZE, CELL_SIZE, 6);
        
        // Add a simple inner highlight for a bit of depth
        g.lineStyle(2, 0xffffff, alpha * 0.2);
        g.strokeRoundedRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2, 5);
    }

    // ── Card Helper (rounded, clean white) ──────────────────

    _drawCard(g, x, y, w, h) {
        // Shadow
        g.fillStyle(0x000000, 0.08);
        g.fillRoundedRect(x + 2, y + 2, w, h, 12);
        // Card body
        g.fillStyle(C.CARD_BG, 1);
        g.fillRoundedRect(x, y, w, h, 12);
        // Border
        g.lineStyle(1, C.CARD_BORDER, 0.6);
        g.strokeRoundedRect(x, y, w, h, 12);
    }

    // ── Button Helper (rounded) ─────────────────────────────

    _drawButton(g, x, y, w, h, bgColor = C.BTN_BG) {
        g.fillStyle(bgColor, 1);
        g.fillRoundedRect(x, y, w, h, 8);
        // Top highlight
        g.fillStyle(0xffffff, 0.15);
        g.fillRoundedRect(x, y, w, h / 2, { tl: 8, tr: 8, bl: 0, br: 0 });
    }

    // ── Crown Shake Effect ──────────────────────────────────

    _shakeCrown(intensity = 'small') {
        this.tweens.killTweensOf(this.crownIcon);
        if (intensity === 'big') {
            // Line clear: goyang kencang + membesar
            this.tweens.add({
                targets: this.crownIcon,
                angle: { from: -12, to: 12 },
                scaleX: 0.09, scaleY: 0.09,
                yoyo: true, repeat: 2, duration: 80,
                ease: 'Sine.easeInOut',
                onComplete: () => {
                    this.crownIcon.setAngle(0);
                    this.tweens.add({
                        targets: this.crownIcon,
                        scaleX: 0.06, scaleY: 0.06,
                        duration: 150, ease: 'Back.easeOut'
                    });
                }
            });
        } else {
            // Place tanpa clear: goyang kecil
            this.tweens.add({
                targets: this.crownIcon,
                angle: { from: -4, to: 4 },
                yoyo: true, repeat: 1, duration: 60,
                ease: 'Sine.easeInOut',
                onComplete: () => this.crownIcon.setAngle(0)
            });
        }
    }

    // ── Piece Container ─────────────────────────────────────

    _createPieceContainer(shapeData, scale = SLOT_SCALE) {
        const container = this.add.container(0, 0);
        container.shapeData = shapeData;

        let maxCol = 0, maxRow = 0;
        shapeData.cells.forEach(([c, r]) => {
            if (c > maxCol) maxCol = c;
            if (r > maxRow) maxRow = r;
        });

        const pieceW = (maxCol + 1) * GRID_STEP;
        const pieceH = (maxRow + 1) * GRID_STEP;
        container.pieceOffsetX = -pieceW / 2;
        container.pieceOffsetY = -pieceH / 2;
        container.pieceWidth = pieceW;
        container.pieceHeight = pieceH;

        const g = this.add.graphics();
        const maskG = this.make.graphics();
        maskG.fillStyle(0xffffff, 1);

        shapeData.cells.forEach(([c, r, colorObj]) => {
            const bx = container.pieceOffsetX + c * GRID_STEP;
            const by = container.pieceOffsetY + r * GRID_STEP;
            
            maskG.fillRoundedRect(bx, by, CELL_SIZE, CELL_SIZE, 5);

            if (colorObj && colorObj.useSprite) {
                const img = this.add.image(bx, by, colorObj.useSprite)
                    .setOrigin(0, 0)
                    .setDisplaySize(CELL_SIZE, CELL_SIZE);
                container.add(img);
            } else {
                const fallbackColor = colorObj ? colorObj.color : 0xcbd5e1;
                this._drawPixelCell(g, bx, by, fallbackColor, 1);
            }
        });
        container.add(g);
        
        container.add(maskG);
        maskG.setAlpha(0);
        container.setMask(maskG.createGeometryMask());

        container.setScale(scale).setDepth(20);
        return container;
    }

    _normalizeColor(colorObj) {
        if (typeof colorObj === 'number') {
            return ACTIVE_COLORS.find(activeColor => activeColor.color === colorObj) || null;
        }
        if (!colorObj || typeof colorObj !== 'object') return null;
        return ACTIVE_COLORS.find(activeColor =>
            activeColor.id === colorObj.id ||
            activeColor.color === colorObj.color ||
            activeColor.useSprite === colorObj.useSprite
        ) || null;
    }

    _normalizeShape(shapeData) {
        if (!shapeData || !Array.isArray(shapeData.cells) || shapeData.cells.length === 0) {
            return null;
        }

        const cells = [];
        const occupied = new Set();

        for (const cell of shapeData.cells) {
            if (!Array.isArray(cell) || cell.length < 2) return null;

            const [c, r, colorObj] = cell;
            if (!Number.isInteger(c) || !Number.isInteger(r) || c < 0 || r < 0) {
                return null;
            }

            const key = `${c},${r}`;
            if (occupied.has(key)) return null;
            occupied.add(key);

            cells.push([c, r, this._normalizeColor(colorObj) || this._getSmartColor()]);
        }

        return { cells };
    }

    // ── Input ───────────────────────────────────────────────

    _setupInput() {
        this.input.on('pointermove', (pointer) => {
            if (!this.activeDragPiece || pointer.id !== this.activePointerId) return;
            // [FIX] Block drag while paused or game over
            if (this.isGameOver || this.isPaused) {
                this._cancelDrop();
                return;
            }
            this.activeDragPiece.x = pointer.x;
            this.activeDragPiece.y = pointer.y + FINGER_OFFSET_Y;
            this._updateGhost(this.activeDragPiece);
        });

        this.input.on('pointerup', (pointer) => {
            if (!this.activeDragPiece || pointer.id !== this.activePointerId) return;
            this._dropPiece();
        });

        this.input.on('pointerupoutside', (pointer) => {
            if (this.activeDragPiece && pointer.id === this.activePointerId) {
                this._cancelDrop();
            }
        });
    }

    _startDrag(container, slotIndex, pointer) {
        this.activeDragPiece = container;
        this.activeDragSlot = slotIndex;
        this.activePointerId = pointer.id;
        this.lastGhostKey = null;

        this.audio.playPickup();
        triggerHaptic(12);

        container.setDepth(60).setScale(1.0);
        this.tweens.killTweensOf(container);
        container.x = pointer.x;
        container.y = pointer.y + FINGER_OFFSET_Y;
        this._updateGhost(container);
    }

    _dropPiece() {
        const piece = this.activeDragPiece;
        const slotIdx = this.activeDragSlot;

        this.activeDragPiece = null;
        this.activeDragSlot = null;
        this.activePointerId = null;
        this.lastGhostKey = null;
        this.ghostGraphics.setVisible(false);

        const shapeData = this._normalizeShape(piece?.shapeData);
        const coord = this._gridCoordOf(piece);
        if (shapeData && coord && this._canPlace(shapeData.cells, coord.col, coord.row)) {
            piece.shapeData = shapeData;
            this._placePiece(slotIdx, piece, coord.col, coord.row);
        } else {
            this._returnToSlot(piece, slotIdx);
        }
    }

    _cancelDrop() {
        const piece = this.activeDragPiece;
        const slotIdx = this.activeDragSlot;
        if (!piece) return; // [FIX] Guard against double-cancel
        this.activeDragPiece = null;
        this.activeDragSlot = null;
        this.activePointerId = null;
        this.lastGhostKey = null;
        this.ghostGraphics.setVisible(false);
        this._returnToSlot(piece, slotIdx);
    }

    _returnToSlot(container, slotIndex) {
        const pos = SLOT_CONFIG[slotIndex];
        if (!container || !pos) return;
        container.setDepth(20);
        this.tweens.add({
            targets: container,
            x: pos.x, y: pos.y,
            scaleX: SLOT_SCALE, scaleY: SLOT_SCALE,
            duration: 150, ease: 'Cubic.easeOut'
        });
    }

    // ── Grid Helpers ────────────────────────────────────────

    _gridCoordOf(container) {
        if (!container) return null;
        const tlX = container.x + container.pieceOffsetX;
        const tlY = container.y + container.pieceOffsetY;
        const col = Math.round((tlX - GRID_START_X) / GRID_STEP);
        const row = Math.round((tlY - GRID_START_Y) / GRID_STEP);
        // [FIX] Tighten range — no need to accept coords far outside grid
        if (col >= 0 && col < GRID_SIZE && row >= 0 && row < GRID_SIZE) {
            return { col, row };
        }
        // Allow slight overshoot for pieces that extend beyond their origin
        if (col >= -1 && col <= GRID_SIZE && row >= -1 && row <= GRID_SIZE) {
            return { col, row };
        }
        return null;
    }

    _updateGhost(container) {
        if (!Array.isArray(container?.shapeData?.cells)) {
            this.lastGhostKey = null;
            this.ghostGraphics.setVisible(false);
            return;
        }

        const coord = this._gridCoordOf(container);
        if (coord && this._canPlace(container.shapeData.cells, coord.col, coord.row)) {
            const colorsKey = container.shapeData.cells.map(cell => cell[2]?.id || cell[2]?.color || '').join('|');
            const key = `${coord.col},${coord.row},${colorsKey}`;
            if (this.lastGhostKey !== key) {
                this.lastGhostKey = key;
                this._drawGhost(container.shapeData, coord.col, coord.row);
                this.ghostGraphics.setVisible(true);
            }
        } else if (this.lastGhostKey !== null) {
            this.lastGhostKey = null;
            this.ghostGraphics.setVisible(false);
        }
    }

    _drawGhost(shapeData, targetCol, targetRow) {
        this.ghostGraphics.clear();
        shapeData.cells.forEach(([c, r, colorObj]) => {
            const x = GRID_START_X + (targetCol + c) * GRID_STEP;
            const y = GRID_START_Y + (targetRow + r) * GRID_STEP;
            const fallbackColor = colorObj ? colorObj.color : 0xcbd5e1;
            this.ghostGraphics.fillStyle(fallbackColor, 0.35);
            this.ghostGraphics.fillRoundedRect(x, y, CELL_SIZE, CELL_SIZE, 6);
        });
    }

    _canPlace(cells, targetCol, targetRow) {
        if (!Array.isArray(cells) || !Number.isInteger(targetCol) || !Number.isInteger(targetRow)) {
            return false;
        }

        for (const [c, r] of cells) {
            const col = targetCol + c;
            const row = targetRow + r;
            if (col < 0 || col >= GRID_SIZE || row < 0 || row >= GRID_SIZE) return false;
            if (this.board[row][col] !== null) return false;
        }
        return true;
    }

    // ── Place & Score ───────────────────────────────────────

    _placePiece(slotIndex, container, targetCol, targetRow) {
        const shapeData = this._normalizeShape(container?.shapeData);
        if (!shapeData || !Number.isInteger(slotIndex) || !this._canPlace(shapeData.cells, targetCol, targetRow)) {
            this._returnToSlot(container, slotIndex);
            return;
        }

        this.audio.playPlace();
        triggerHaptic(18);

        shapeData.cells.forEach(([c, r, colorObj]) => {
            const fallbackColor = colorObj ? colorObj.color : 0xcbd5e1;
            this.board[targetRow + r][targetCol + c] = fallbackColor;
            
            // Track sprite info for sprite cells
            if (colorObj && colorObj.useSprite) {
                this.boardSprite[targetRow + r][targetCol + c] = colorObj.useSprite;
            } else {
                this.boardSprite[targetRow + r][targetCol + c] = null;
            }
        });

        this._renderBoardFills();
        this._addScore(shapeData.cells.length);

        this._spawnPlaceParticles(targetCol, targetRow, shapeData);

        container.destroy();
        this.slotContainers[slotIndex] = null;
        this.slotPieces[slotIndex] = null;

        const isMatch = this._resolveMatches();

        this._shakeCrown(isMatch ? 'big' : 'small');

        if (this.slotPieces.every(piece => piece === null)) this.spawnSlotPieces();

        this._checkGameOver();
    }

    // ── Efek partikel saat menaruh balok ─────────────────────

    _spawnPlaceParticles(col, row, shapeData) {
        // [FIX] Calculate true center of all cells, not just the origin cell
        let sumX = 0, sumY = 0;
        shapeData.cells.forEach(([c, r]) => {
            sumX += GRID_START_X + (col + c) * GRID_STEP + CELL_SIZE / 2;
            sumY += GRID_START_Y + (row + r) * GRID_STEP + CELL_SIZE / 2;
        });
        const centerX = sumX / shapeData.cells.length;
        const centerY = sumY / shapeData.cells.length;
        const count = 6;
        
        let pColor = 0xcbd5e1;
        if (shapeData.cells.length > 0 && shapeData.cells[0][2]) {
            pColor = shapeData.cells[0][2].color;
        }

        for (let i = 0; i < count; i++) {
            const particle = this.add.graphics().setDepth(50);
            const size = Phaser.Math.Between(2, 5);
            particle.fillStyle(pColor, 1);
            particle.fillRect(-size / 2, -size / 2, size, size);
            particle.setPosition(centerX, centerY);

            const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
            const dist = Phaser.Math.Between(15, 35);

            this.tweens.add({
                targets: particle,
                x: centerX + Math.cos(angle) * dist,
                y: centerY + Math.sin(angle) * dist,
                alpha: 0,
                scaleX: 0.3,
                scaleY: 0.3,
                duration: 300,
                ease: 'Cubic.easeOut',
                onComplete: () => particle.destroy()
            });
        }
    }

    // ── Line Clear ──────────────────────────────────────────

    _findMatchCells() {
        const visited = new Set();
        const matchedCells = new Set();
        
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const colorValue = this.board[r][c];
                if (colorValue === null) continue;
                
                const key = `${r},${c}`;
                if (visited.has(key)) continue;
                
                const group = [];
                const queue = [[r, c]];
                visited.add(key);
                
                while (queue.length > 0) {
                    const [currR, currC] = queue.shift();
                    group.push(`${currR},${currC}`);
                    
                    const dirs = [[0,1], [1,0], [0,-1], [-1,0]];
                    for (const [dr, dc] of dirs) {
                        const nr = currR + dr;
                        const nc = currC + dc;
                        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
                            if (this.board[nr][nc] === colorValue) {
                                const nKey = `${nr},${nc}`;
                                if (!visited.has(nKey)) {
                                    visited.add(nKey);
                                    queue.push([nr, nc]);
                                }
                            }
                        }
                    }
                }
                
                if (group.length >= 3) {
                    group.forEach(k => matchedCells.add(k));
                }
            }
        }

        return matchedCells;
    }

    _resolveMatches() {
        let matched = false;
        let guard = GRID_SIZE * GRID_SIZE;

        while (guard-- > 0) {
            const toClear = this._findMatchCells();
            if (toClear.size === 0) {
                if (!matched) this.comboStreak = 0;
                break;
            }
            this._clearMatchedCells(toClear);
            matched = true;
        }

        return matched;
    }

    _clearMatchedCells(toClear) {
        if (toClear.size === 0) {
            this.comboStreak = 0;
            return false;
        }

        this.comboStreak++;
        this.audio.playLineClear(1);
        triggerHaptic(toClear.size >= 5 ? [30, 40, 60] : 30);

        const comboBonus = (this.comboStreak > 1) ? this.comboStreak * 5 : 0;
        const lineScore = (toClear.size * 10) + comboBonus;
        this._addScore(lineScore);

        // Shake lebih mulus / tidak heboh
        this.cameras.main.shake(80, toClear.size >= 5 ? 0.003 : 0.001);

        if (toClear.size >= 5) {
            this._floatText(`WOW! ${toClear.size} MATCH!`, 180, 260);
        }
        if (this.comboStreak > 1) {
            this._floatText(`STREAK x${this.comboStreak}!`, 180, 285);
        }
        this._floatText(`+${lineScore}`, 180, toClear.size >= 5 ? 310 : 265);

        const flash = this.add.graphics().setDepth(15);
        const clearedCells = [];
        toClear.forEach(key => {
            const [r, c] = key.split(',').map(Number);
            const x = GRID_START_X + c * GRID_STEP;
            const y = GRID_START_Y + r * GRID_STEP;
            
            const colorNum = this.board[r][c] || 0xcbd5e1;

            flash.fillStyle(0xffffff, 0.7);
            flash.fillRoundedRect(x, y, CELL_SIZE, CELL_SIZE, 6);

            clearedCells.push([x, y, colorNum]);
            this.board[r][c] = null;
            this.boardSprite[r][c] = null;
        });

        this._renderBoardFills();
        clearedCells.forEach(([x, y, colorNum]) => this._spawnClearParticle(x, y, colorNum));

        this.tweens.add({
            targets: flash, alpha: 0, duration: 150, ease: 'Linear',
            onComplete: () => { flash.destroy(); }
        });

        return true;
    }

    // ── Partikel pixel saat baris/kolom bersih ───────────────

    _spawnClearParticle(x, y, color) {
        // Spawn glow
        const glow = this.add.image(x + CELL_SIZE/2, y + CELL_SIZE/2, 'pt-glow').setDepth(49).setTint(color).setAlpha(0.6).setScale(0.5);
        this.tweens.add({
            targets: glow, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 400, ease: 'Sine.easeOut',
            onComplete: () => glow.destroy()
        });

        // Spawn sparkles
        const count = 3;
        for (let i = 0; i < count; i++) {
            const p = this.add.image(x + CELL_SIZE/2, y + CELL_SIZE/2, 'pt-sparkle').setDepth(50).setTint(color).setScale(Phaser.Math.FloatBetween(0.2, 0.5));
            
            this.tweens.add({
                targets: p,
                x: p.x + Phaser.Math.Between(-30, 30),
                y: p.y + Phaser.Math.Between(-30, 30),
                alpha: 0,
                angle: Phaser.Math.Between(-180, 180),
                duration: Phaser.Math.Between(300, 500),
                ease: 'Quad.easeOut',
                onComplete: () => p.destroy()
            });
        }
    }

    // ── Floating Score Text ─────────────────────────────────

    _floatText(text, x, y) {
        const label = this.add.text(x, y, text, {
            fontFamily: FONT_PIXEL, fontSize: '8px',
            color: '#f59e0b', stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(70).setResolution(4);

        this.tweens.add({
            targets: label, y: y - 40, alpha: 0, scaleX: 1.15, scaleY: 1.15,
            duration: 700, ease: 'Back.easeOut',
            onComplete: () => label.destroy()
        });
    }

    // ── Board-Aware Smart Shape & Color Fit Algorithm ─────────

    _getBoardOccupancy() {
        let occupied = 0;
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (this.board[r][c] !== null) occupied++;
            }
        }
        return occupied / (GRID_SIZE * GRID_SIZE);
    }

    _getValidPlacements(shapeCells) {
        const placements = [];
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (this._canPlace(shapeCells, c, r)) {
                    placements.push({ col: c, row: r });
                }
            }
        }
        return placements;
    }

    _pickFittingShape(poolSpec) {
        const totalWeight = poolSpec.reduce((sum, item) => sum + item.weight, 0);
        let roll = Math.random() * totalWeight;
        let chosenPool = poolSpec[0].pool;
        for (const item of poolSpec) {
            roll -= item.weight;
            if (roll <= 0) {
                chosenPool = item.pool;
                break;
            }
        }

        // 1. Try candidates from chosen pool
        const shuffledChosen = Phaser.Utils.Array.Shuffle([...chosenPool]);
        for (const cells of shuffledChosen) {
            if (this._getValidPlacements(cells).length > 0) {
                return cells;
            }
        }

        // 2. Fallback to any pool in spec that fits
        for (const item of poolSpec) {
            const shuffledPool = Phaser.Utils.Array.Shuffle([...item.pool]);
            for (const cells of shuffledPool) {
                if (this._getValidPlacements(cells).length > 0) {
                    return cells;
                }
            }
        }

        // 3. Universal fallbacks to guarantee fitting
        for (const fallbackPool of [POOL_2, POOL_1]) {
            const shuffledFb = Phaser.Utils.Array.Shuffle([...fallbackPool]);
            for (const cells of shuffledFb) {
                if (this._getValidPlacements(cells).length > 0) {
                    return cells;
                }
            }
        }

        return POOL_1[0];
    }

    /**
     * Colorize piece with STRICT RULE:
     * No single color may appear more than 2 times in any piece (max 2 per color).
     * Synergizes with neighboring board cells to reward strategic placement.
     */
    _colorizePiece(shapeCells) {
        const placements = this._getValidPlacements(shapeCells);

        // Gather adjacent cell colors from valid placement positions on board
        const neighborColorCounts = new Map();
        ACTIVE_COLORS.forEach(c => neighborColorCounts.set(c.id, 0));

        if (placements.length > 0) {
            const samplePlacements = Phaser.Utils.Array.Shuffle([...placements]).slice(0, 6);
            const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
            for (const { col, row } of samplePlacements) {
                for (const [cx, cy] of shapeCells) {
                    const x = col + cx;
                    const y = row + cy;
                    for (const [dx, dy] of dirs) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
                            const boardVal = this.board[ny][nx];
                            if (boardVal !== null) {
                                const found = ACTIVE_COLORS.find(c => c.color === boardVal);
                                if (found) {
                                    neighborColorCounts.set(found.id, (neighborColorCounts.get(found.id) || 0) + 1);
                                }
                            }
                        }
                    }
                }
            }
        }

        // Active board colors
        const boardUniqueColors = [];
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const bVal = this.board[r][c];
                if (bVal !== null) {
                    const found = ACTIVE_COLORS.find(col => col.color === bVal);
                    if (found && !boardUniqueColors.includes(found)) {
                        boardUniqueColors.push(found);
                    }
                }
            }
        }

        // Synergistic colors sorted by frequency
        const sortedSynergy = ACTIVE_COLORS
            .filter(c => (neighborColorCounts.get(c.id) || 0) > 0)
            .sort((a, b) => neighborColorCounts.get(b.id) - neighborColorCounts.get(a.id));

        // 1. Primary Color (synergizes with neighbor board cells)
        let primaryColor;
        if (sortedSynergy.length > 0 && Math.random() < 0.70) {
            primaryColor = sortedSynergy[0];
        } else if (boardUniqueColors.length > 0 && Math.random() < 0.50) {
            primaryColor = Phaser.Utils.Array.GetRandom(boardUniqueColors);
        } else {
            primaryColor = Phaser.Utils.Array.GetRandom(ACTIVE_COLORS);
        }

        // 2. Secondary Color
        const otherSynergy = sortedSynergy.filter(c => c.id !== primaryColor.id);
        const remainingColors = ACTIVE_COLORS.filter(c => c.id !== primaryColor.id);
        const secondaryColor = otherSynergy.length > 0 && Math.random() < 0.60
            ? otherSynergy[0]
            : Phaser.Utils.Array.GetRandom(remainingColors);

        // 3. Tertiary Color
        const remaining3rd = ACTIVE_COLORS.filter(c => c.id !== primaryColor.id && c.id !== secondaryColor.id);
        const tertiaryColor = Phaser.Utils.Array.GetRandom(remaining3rd);

        // 4. Quaternary Color
        const remaining4th = ACTIVE_COLORS.filter(c => c.id !== primaryColor.id && c.id !== secondaryColor.id && c.id !== tertiaryColor.id);
        const quaternaryColor = Phaser.Utils.Array.GetRandom(remaining4th);

        const numCells = shapeCells.length;
        const assignedColors = [];

        if (numCells === 1) {
            assignedColors.push(primaryColor);
        } else if (numCells === 2) {
            // 65% same color (A, A) - valid (<= 2), 35% distinct (A, B)
            if (Math.random() < 0.65) {
                assignedColors.push(primaryColor, primaryColor);
            } else {
                assignedColors.push(primaryColor, secondaryColor);
            }
        } else if (numCells === 3) {
            // NEVER (A, A, A)! Max 2 of same color.
            // 75% (A, A, B)
            // 25% (A, B, C)
            if (Math.random() < 0.75) {
                assignedColors.push(primaryColor, primaryColor, secondaryColor);
            } else {
                assignedColors.push(primaryColor, secondaryColor, tertiaryColor);
            }
        } else if (numCells === 4) {
            // NEVER 3+ of same color! Max 2 of any color.
            // 55% (A, A, B, B)
            // 35% (A, A, B, C)
            // 10% (A, B, C, D)
            const roll = Math.random();
            if (roll < 0.55) {
                assignedColors.push(primaryColor, primaryColor, secondaryColor, secondaryColor);
            } else if (roll < 0.90) {
                assignedColors.push(primaryColor, primaryColor, secondaryColor, tertiaryColor);
            } else {
                assignedColors.push(primaryColor, secondaryColor, tertiaryColor, quaternaryColor);
            }
        } else {
            // 5 cells: (A, A, B, B, C) - max 2 per color!
            assignedColors.push(primaryColor, primaryColor, secondaryColor, secondaryColor, tertiaryColor);
        }

        // Strict Safety Guard: ensure no color appears more than 2 times
        const colorCounts = new Map();
        assignedColors.forEach(c => colorCounts.set(c.id, (colorCounts.get(c.id) || 0) + 1));
        for (let i = 0; i < assignedColors.length; i++) {
            const cId = assignedColors[i].id;
            if (colorCounts.get(cId) > 2) {
                const spare = ACTIVE_COLORS.find(c => (colorCounts.get(c.id) || 0) < 2);
                if (spare) {
                    colorCounts.set(cId, colorCounts.get(cId) - 1);
                    colorCounts.set(spare.id, (colorCounts.get(spare.id) || 0) + 1);
                    assignedColors[i] = spare;
                }
            }
        }

        return shapeCells.map(([cx, cy], idx) => [cx, cy, assignedColors[idx]]);
    }

    spawnSlotPieces() {
        const occupancy = this._getBoardOccupancy();

        // Wave composition with rich shape variety and adaptive tension
        let spec0, spec1, spec2;
        if (occupancy > 0.65) {
            // Danger state: guarantee small/medium fits to allow recovery
            spec0 = [{ pool: POOL_1, weight: 0.50 }, { pool: POOL_2, weight: 0.50 }];
            spec1 = [{ pool: POOL_2, weight: 0.50 }, { pool: POOL_3, weight: 0.50 }];
            spec2 = [{ pool: POOL_3, weight: 0.60 }, { pool: POOL_2, weight: 0.40 }];
        } else if (occupancy > 0.35) {
            // Mid game: rich variety, strategic puzzle challenge
            spec0 = [{ pool: POOL_1, weight: 0.20 }, { pool: POOL_2, weight: 0.40 }, { pool: POOL_3, weight: 0.40 }];
            spec1 = [{ pool: POOL_3, weight: 0.50 }, { pool: POOL_4, weight: 0.50 }];
            spec2 = [{ pool: POOL_3, weight: 0.35 }, { pool: POOL_4, weight: 0.45 }, { pool: POOL_5, weight: 0.20 }];
        } else {
            // Early game / low occupancy: interesting patterns to paint the board
            spec0 = [{ pool: POOL_2, weight: 0.40 }, { pool: POOL_3, weight: 0.60 }];
            spec1 = [{ pool: POOL_3, weight: 0.45 }, { pool: POOL_4, weight: 0.55 }];
            spec2 = [{ pool: POOL_4, weight: 0.60 }, { pool: POOL_5, weight: 0.40 }];
        }

        const slotSpecs = [spec0, spec1, spec2];

        for (let i = 0; i < 3; i++) {
            if (this.slotPieces[i] !== null) continue;

            const shapeCells = this._pickFittingShape(slotSpecs[i]);
            const coloredCells = this._colorizePiece(shapeCells);

            const shape = {
                cells: coloredCells,
                key: shapeKey(shapeCells)
            };

            this.slotPieces[i] = shape;

            const conf = SLOT_CONFIG[i];
            const container = this._createPieceContainer(shape, SLOT_SCALE);
            container.setPosition(conf.x, conf.y).setScale(0);
            this.slotContainers[i] = container;

            this.tweens.add({
                targets: container,
                scaleX: SLOT_SCALE, scaleY: SLOT_SCALE,
                duration: 160, delay: i * 40, ease: 'Back.easeOut'
            });
        }
    }

    // ── Game Over ───────────────────────────────────────────

    _checkGameOver() {
        if (this.slotPieces.every(piece => piece === null)) {
            this._triggerGameOver();
            return;
        }

        for (let i = 0; i < 3; i++) {
            const shape = this.slotPieces[i];
            if (!shape) continue;
            let fits = false;
            outer: for (let r = 0; r < GRID_SIZE; r++) {
                for (let c = 0; c < GRID_SIZE; c++) {
                    if (this._canPlace(shape.cells, c, r)) { fits = true; break outer; }
                }
            }
            if (this.slotContainers[i]) this.slotContainers[i].setAlpha(fits ? 1 : 0.3);
        }

        const anyMove = this.slotPieces.some(shape => {
            if (!shape) return false;
            for (let r = 0; r < GRID_SIZE; r++)
                for (let c = 0; c < GRID_SIZE; c++)
                    if (this._canPlace(shape.cells, c, r)) return true;
            return false;
        });

        if (!anyMove && this.slotPieces.some(p => p !== null)) this._triggerGameOver();
    }

    _triggerGameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.audio.playGameOver();
        triggerHaptic([60, 60, 100]);
        clearGameState();

        // [FIX] Cancel any active drag immediately on game over
        if (this.activeDragPiece) {
            this._cancelDrop();
        }

        this.cameras.main.shake(400, 0.012);

        this.gameOverTimer?.remove(false);
        this.gameOverTimer = this.time.delayedCall(400, () => {
            if (!this.isGameOver) return;
            this.finalScoreText.setText(`${this.score}`);
            const isRecord = this.score >= this.highScore && this.score > 0;
            this.newRecordBadge.setVisible(isRecord);

            if (isRecord) this._spawnConfetti();

            this.gameOverContainer.setVisible(true).setAlpha(0);
            this.tweens.add({ targets: this.gameOverContainer, alpha: 1, duration: 300, ease: 'Linear' });
        });
    }

    // ── Efek Konfeti Pixel (Rekor Baru) ─────────────────────

    _spawnConfetti() {
        const colors = [0xf43f5e, 0xfacc15, 0x06b6d4, 0x84cc16, 0xa855f7, 0xfb923c];
        for (let i = 0; i < 40; i++) {
            const p = this.add.graphics().setDepth(110);
            const sz = Phaser.Math.Between(3, 6);
            p.fillStyle(Phaser.Utils.Array.GetRandom(colors), 1);
            p.fillRect(0, 0, sz, sz);
            p.setPosition(Phaser.Math.Between(30, 330), Phaser.Math.Between(-20, -60));

            this.tweens.add({
                targets: p,
                y: Phaser.Math.Between(200, 620),
                x: p.x + Phaser.Math.Between(-40, 40),
                angle: Phaser.Math.Between(-180, 180),
                alpha: 0,
                duration: Phaser.Math.Between(800, 1600),
                delay: Phaser.Math.Between(0, 400),
                ease: 'Cubic.easeIn',
                onComplete: () => p.destroy()
            });
        }
    }

    // ── Game Over Overlay ───────────────────────────────────

    _buildGameOverOverlay() {
        this.gameOverContainer = this.add.container(0, 0).setDepth(100).setVisible(false);

        // Dim
        const dim = this.add.graphics();
        dim.fillStyle(0x000000, 0.45);
        dim.fillRect(0, 0, 360, 640);
        this.gameOverContainer.add(dim);

        // Card
        const cardX = 40, cardY = 160, cardW = 280, cardH = 300;
        const card = this.add.graphics();
        this._drawCard(card, cardX, cardY, cardW, cardH);
        this.gameOverContainer.add(card);

        // Title
        const title = this.add.text(180, 195, 'GAME OVER', {
            fontFamily: FONT_PIXEL, fontSize: '12px', color: '#f43f5e'
        }).setOrigin(0.5).setResolution(4);
        this.gameOverContainer.add(title);

        // Mahkota icon
        const goCrown = this.add.image(180, 245, 'mahkota').setScale(0.09);
        this.gameOverContainer.add(goCrown);

        // Skor akhir
        this.finalScoreText = this.add.text(180, 300, '0', {
            fontFamily: FONT_PIXEL, fontSize: '18px', color: '#1e293b'
        }).setOrigin(0.5).setResolution(4);
        this.gameOverContainer.add(this.finalScoreText);

        // Rekor baru badge
        this.newRecordBadge = this.add.text(180, 332, 'REKOR BARU!', {
            fontFamily: FONT_PIXEL, fontSize: '8px', color: '#f59e0b'
        }).setOrigin(0.5).setVisible(false).setResolution(4);
        this.gameOverContainer.add(this.newRecordBadge);

        // Tombol Main Lagi
        const btnW = 200, btnH = 40;
        const btnX = 180 - btnW / 2, btnY = 395;
        const btn = this.add.graphics();
        this._drawButton(btn, btnX, btnY, btnW, btnH, C.BTN_BG);
        this.gameOverContainer.add(btn);

        const btnTxt = this.add.text(180, btnY + btnH / 2, 'MAIN LAGI', {
            fontFamily: FONT_PIXEL, fontSize: '8px', color: '#ffffff'
        }).setOrigin(0.5).setResolution(4);
        this.gameOverContainer.add(btnTxt);

        const hitZone = this.add.zone(180, btnY + btnH / 2, btnW, btnH)
            .setInteractive({ useHandCursor: true });
        this.gameOverContainer.add(hitZone);
        hitZone.on('pointerdown', () => this._resetGame());
    }

    // ── Pause Overlay ───────────────────────────────────────

    _buildPauseOverlay() {
        this.pauseContainer = this.add.container(0, 0).setDepth(100).setVisible(false);

        // Dim
        const dim = this.add.graphics();
        dim.fillStyle(0x000000, 0.45);
        dim.fillRect(0, 0, 360, 640);
        this.pauseContainer.add(dim);

        // Card
        const cardX = 55, cardY = 200, cardW = 250, cardH = 220;
        const card = this.add.graphics();
        this._drawCard(card, cardX, cardY, cardW, cardH);
        this.pauseContainer.add(card);

        // Pause title
        const pauseTitle = this.add.text(180, 230, 'PAUSED', {
            fontFamily: FONT_PIXEL, fontSize: '12px', color: '#1e293b'
        }).setOrigin(0.5).setResolution(4);
        this.pauseContainer.add(pauseTitle);

        // Tombol Lanjut
        const btn1W = 180, btn1H = 36;
        const btn1X = 180 - btn1W / 2, btn1Y = 270;
        const btn1 = this.add.graphics();
        this._drawButton(btn1, btn1X, btn1Y, btn1W, btn1H, C.BTN_GREEN);
        this.pauseContainer.add(btn1);

        const btn1Txt = this.add.text(180, btn1Y + btn1H / 2, 'LANJUT', {
            fontFamily: FONT_PIXEL, fontSize: '8px', color: '#ffffff'
        }).setOrigin(0.5).setResolution(4);
        this.pauseContainer.add(btn1Txt);

        const hit1 = this.add.zone(180, btn1Y + btn1H / 2, btn1W, btn1H)
            .setInteractive({ useHandCursor: true });
        this.pauseContainer.add(hit1);
        hit1.on('pointerdown', () => this._togglePause(false));

        // Tombol Mulai Ulang
        const btn2Y = btn1Y + btn1H + 16;
        const btn2 = this.add.graphics();
        this._drawButton(btn2, btn1X, btn2Y, btn1W, btn1H, C.BTN_RED);
        this.pauseContainer.add(btn2);

        const btn2Txt = this.add.text(180, btn2Y + btn1H / 2, 'MULAI ULANG', {
            fontFamily: FONT_PIXEL, fontSize: '8px', color: '#ffffff'
        }).setOrigin(0.5).setResolution(4);
        this.pauseContainer.add(btn2Txt);

        const hit2 = this.add.zone(180, btn2Y + btn1H / 2, btn1W, btn1H)
            .setInteractive({ useHandCursor: true });
        this.pauseContainer.add(hit2);
        hit2.on('pointerdown', () => {
            this._togglePause(false);
            this._resetGame();
        });
    }

    _togglePause(paused) {
        this.isPaused = paused;
        this.pauseContainer.setVisible(paused);
        if (paused) {
            // [FIX] Cancel any active drag when pausing
            if (this.activeDragPiece) {
                this._cancelDrop();
            }
            this.pauseContainer.setAlpha(0);
            this.tweens.add({ targets: this.pauseContainer, alpha: 1, duration: 150 });
        }
    }

    // ── Score & Persistence ─────────────────────────────────

    _addScore(points) {
        this.score += points;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            saveHighScore(this.highScore);

            // Efek: mahkota berkedip saat rekor terlampaui
            this.tweens.add({
                targets: this.crownIcon,
                scaleX: 0.12, scaleY: 0.12,
                yoyo: true, duration: 150,
                ease: 'Back.easeOut'
            });
        }
        this._syncScoreUI();

        // Efek: score pop animation
        this.tweens.killTweensOf(this.scoreValueText);
        this.scoreValueText.setScale(1.3);
        this.tweens.add({
            targets: this.scoreValueText,
            scaleX: 1, scaleY: 1,
            duration: 200, ease: 'Back.easeOut'
        });
    }

    _syncScoreUI() {
        this.scoreValueText.setText(`${this.score}`);
        this.highScoreValueText.setText(`${this.highScore}`);
    }

    _resetGame() {
        this.isGameOver = false;
        this.isPaused = false;
        this.comboStreak = 0;
        this.lastGeneratedShapeKey = null;
        this.shapeFrequency = Object.create(null);
        this.gameOverTimer?.remove(false);
        this.gameOverTimer = null;
        this.gameOverContainer.setVisible(false);
        this.pauseContainer.setVisible(false);
        this.score = 0;
        this._syncScoreUI();

        for (let r = 0; r < GRID_SIZE; r++) {
            this.board[r].fill(null);
            this.boardSprite[r].fill(null);
        }
        this._renderBoardFills();

        for (let i = 0; i < 3; i++) {
            this.slotContainers[i]?.destroy();
            this.slotContainers[i] = null;
            this.slotPieces[i] = null;
        }

        clearGameState();
        this.spawnSlotPieces();
    }
}
