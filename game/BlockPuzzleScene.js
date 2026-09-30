import Phaser from 'phaser';
import { BLOCK_SHAPES } from './BlockShapes.js';
import {
    GRID_SIZE, CELL_SIZE, CELL_GAP, GRID_STEP,
    GRID_START_X, GRID_START_Y,
    BOARD_X, BOARD_Y, BOARD_W, BOARD_H, BOARD_RADIUS,
    FINGER_OFFSET_Y,
    SLOT_CONFIG, SLOT_SCALE,
    FONT_INTER, FONT_RETRO,
    C
} from './Constants.js';
import { RetroAudio, triggerHaptic } from './Audio.js';
import {
    getHighScore, saveHighScore,
    saveGameState, loadGameState, clearGameState
} from './Storage.js';

/**
 * BPS Waiting Game — 1010 Block Puzzle
 * Full Neumorphic / Inset-Shadow dark-mode redesign.
 */
export class BlockPuzzleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BlockPuzzleScene' });
        this.audio = new RetroAudio();
    }

    create() {
        this.score = 0;
        this.highScore = getHighScore();
        this.isGameOver = false;

        this.activeDragPiece = null;
        this.activeDragSlot  = null;
        this.activePointerId = null;
        this.lastGhostKey    = null;

        // Board data: null = empty, hex number = filled colour
        this.board = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));

        this.slotPieces      = [null, null, null];
        this.slotContainers  = [null, null, null];

        // Build scene layers in depth order
        this._buildBackground();
        this._buildHeaderPills();
        this._buildNeumorphicBoard();
        this._buildSlotCards();
        this._buildGhostLayer();
        this._buildGameOverOverlay();
        this._setupInput();

        // Restore or fresh start
        if (!this._restoreSession()) this.spawnSlotPieces();
        this._syncScoreUI();
    }

    // ─── Background ────────────────────────────────────────────────

    _buildBackground() {
        const g = this.add.graphics();

        // Base dark fill
        g.fillStyle(C.BG_BASE, 1);
        g.fillRect(0, 0, 360, 640);

        // Subtle radial vignette top-right (lighter blue-purple tint)
        const rt = this.add.graphics();
        rt.fillStyle(0x1e3a8a, 0.18);
        rt.fillCircle(320, 30, 160);

        // Vignette bottom-left (purple tint)
        const rb = this.add.graphics();
        rb.fillStyle(0x581c87, 0.12);
        rb.fillCircle(40, 610, 140);

        // Inner phone panel (very subtle)
        const panel = this.add.graphics();
        panel.fillStyle(C.BG_PANEL, 0.6);
        panel.fillRoundedRect(6, 6, 348, 628, 16);
    }

    // ─── Header Pills ───────────────────────────────────────────────

    _buildHeaderPills() {
        const CX = 360;

        // ── Score Pill ──────────────────────────────
        this._drawPill(20, 30, 152, 58);
        this.add.text(96, 38, 'SKOR', {
            fontFamily: FONT_INTER, fontSize: '10px', fontStyle: 'bold',
            color: '#4a6080', letterSpacing: 2
        }).setOrigin(0.5, 0).setResolution(2);

        this.scoreValueText = this.add.text(96, 54, '0', {
            fontFamily: FONT_INTER, fontSize: '24px', fontStyle: '900',
            color: '#e2e8f0'
        }).setOrigin(0.5, 0).setResolution(2);

        // ── Best Pill ───────────────────────────────
        this._drawPill(188, 30, 152, 58);
        this.add.text(264, 38, '🏆  TERBAIK', {
            fontFamily: FONT_INTER, fontSize: '10px', fontStyle: 'bold',
            color: '#f59e0b', letterSpacing: 2
        }).setOrigin(0.5, 0).setResolution(2);

        this.highScoreValueText = this.add.text(264, 54, `${this.highScore}`, {
            fontFamily: FONT_INTER, fontSize: '24px', fontStyle: '900',
            color: '#e2e8f0'
        }).setOrigin(0.5, 0).setResolution(2);

        // ── Reset button ────────────────────────────
        const resetBtn = this.add.text(348, 14, '↺', {
            fontFamily: FONT_INTER, fontSize: '20px', color: '#4a6080'
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).setResolution(2);

        resetBtn.on('pointerover',  () => resetBtn.setColor('#94a3b8'));
        resetBtn.on('pointerout',   () => resetBtn.setColor('#4a6080'));
        resetBtn.on('pointerdown',  () => {
            if (window.confirm('Mulai ulang permainan?')) this._resetGame();
        });
    }

    /** Draw a single neumorphic dark pill / card */
    _drawPill(x, y, w, h, radius = 14) {
        const g = this.add.graphics();

        // Dark shadow offset (bottom-right feels elevated)
        g.fillStyle(C.BOARD_SHADOW_D, 0.8);
        g.fillRoundedRect(x + 3, y + 3, w, h, radius);

        // Highlight (top-left edge lift)
        g.fillStyle(C.BOARD_LIGHT_H, 0.4);
        g.fillRoundedRect(x - 1, y - 1, w, h, radius);

        // Main body
        g.fillStyle(C.PILL_BG, 1);
        g.fillRoundedRect(x, y, w, h, radius);

        // Thin border
        g.lineStyle(1, C.PILL_BORDER, 0.7);
        g.strokeRoundedRect(x, y, w, h, radius);
    }

    // ─── Neumorphic 3-Layer Board ───────────────────────────────────

    _buildNeumorphicBoard() {
        const g = this.add.graphics();

        // ── Layer 1: Outer Panel ──────────────────────────────────
        // Deep shadow offset (pressed inward effect outer rim)
        g.fillStyle(C.BOARD_SHADOW_D, 1);
        g.fillRoundedRect(BOARD_X + 4, BOARD_Y + 4, BOARD_W, BOARD_H, BOARD_RADIUS);

        // Highlight rim (opposite corner)
        g.fillStyle(C.BOARD_LIGHT_H, 0.5);
        g.fillRoundedRect(BOARD_X - 2, BOARD_Y - 2, BOARD_W, BOARD_H, BOARD_RADIUS);

        // Outer panel body
        g.fillStyle(C.BOARD_OUTER, 1);
        g.fillRoundedRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H, BOARD_RADIUS);

        // ── Layer 2: Inset Shadow (Neumorphic Concave Effect) ─────
        const innerX = BOARD_X + 8;
        const innerY = BOARD_Y + 8;
        const innerW = BOARD_W - 16;
        const innerH = BOARD_H - 16;
        const innerR = BOARD_RADIUS - 4;

        // Dark top-left inset shadow → illusion of depth
        g.fillStyle(C.BOARD_SHADOW_D, 0.65);
        g.fillRoundedRect(innerX, innerY, innerW, innerH, innerR);

        // Bright bottom-right highlight → light bouncing from far corner
        g.fillStyle(C.BOARD_LIGHT_H, 0.18);
        g.fillRoundedRect(innerX + 3, innerY + 3, innerW - 3, innerH - 3, innerR - 1);

        // ── Layer 3: Grid Inner Background ────────────────────────
        g.fillStyle(C.BOARD_INNER, 1);
        g.fillRoundedRect(innerX + 2, innerY + 2, innerW - 4, innerH - 4, innerR - 2);

        // ── Grid Cells: 100 empty slots ───────────────────────────
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const cx = GRID_START_X + c * GRID_STEP;
                const cy = GRID_START_Y + r * GRID_STEP;
                g.fillStyle(C.CELL_EMPTY, 1);
                g.fillRoundedRect(cx, cy, CELL_SIZE, CELL_SIZE, 4);
                g.lineStyle(1, C.CELL_BORDER, 0.5);
                g.strokeRoundedRect(cx, cy, CELL_SIZE, CELL_SIZE, 4);
            }
        }

        // Dynamic fills layer (redrawn on every board change)
        this.boardFillGraphics = this.add.graphics().setDepth(5);
    }

    _renderBoardFills() {
        this.boardFillGraphics.clear();
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const color = this.board[r][c];
                if (color !== null) {
                    const x = GRID_START_X + c * GRID_STEP;
                    const y = GRID_START_Y + r * GRID_STEP;
                    this._drawNeonCell(this.boardFillGraphics, x, y, color, 1);
                }
            }
        }
    }

    // ─── Slot Cards ─────────────────────────────────────────────────

    _buildSlotCards() {
        for (let i = 0; i < 3; i++) {
            const conf = SLOT_CONFIG[i];
            this._drawPill(conf.boxX, conf.boxY, conf.width, conf.height, 14);

            const zone = this.add.zone(conf.x, conf.y, conf.width, conf.height)
                .setInteractive({ useHandCursor: true })
                .setDepth(25);

            zone.on('pointerdown', (pointer) => {
                if (this.isGameOver || this.activeDragPiece) return;
                const container = this.slotContainers[i];
                if (container) this._startDrag(container, i, pointer);
            });
        }
    }

    // ─── Ghost Layer ────────────────────────────────────────────────

    _buildGhostLayer() {
        this.ghostGraphics = this.add.graphics().setDepth(30).setVisible(false);
    }

    // ─── Neon Cell Renderer ─────────────────────────────────────────

    /**
     * Draw one filled block cell with neon glow layering.
     * Padding=2px on each side gives clear visual separation between cells.
     */
    _drawNeonCell(g, x, y, color, alpha = 1) {
        const pad = 2;
        const sz  = CELL_SIZE - pad * 2;
        const cx  = x + pad;
        const cy  = y + pad;

        // 1. Glow halo (semi-transparent, slightly larger)
        g.fillStyle(color, alpha * 0.15);
        g.fillRoundedRect(cx - 2, cy - 2, sz + 4, sz + 4, 6);

        // 2. Solid neon body
        g.fillStyle(color, alpha);
        g.fillRoundedRect(cx, cy, sz, sz, 4);

        // 3. Top-left bevel highlight
        g.fillStyle(0xffffff, alpha * 0.35);
        g.fillRoundedRect(cx + 2, cy + 2, sz - 4, 3, 2);

        // 4. Bottom-right shadow
        g.fillStyle(0x000000, alpha * 0.3);
        g.fillRoundedRect(cx + 2, cy + sz - 4, sz - 4, 3, 2);

        // 5. Crisp bright outline
        g.lineStyle(1, 0xffffff, alpha * 0.25);
        g.strokeRoundedRect(cx, cy, sz, sz, 4);
    }

    // ─── Piece Container ────────────────────────────────────────────

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
        container.pieceWidth   = pieceW;
        container.pieceHeight  = pieceH;

        const g = this.add.graphics();
        shapeData.cells.forEach(([c, r]) => {
            const bx = container.pieceOffsetX + c * GRID_STEP;
            const by = container.pieceOffsetY + r * GRID_STEP;
            this._drawNeonCell(g, bx, by, shapeData.color, 1);
        });

        container.add(g);
        container.setScale(scale).setDepth(20);
        return container;
    }

    // ─── Input Handlers ─────────────────────────────────────────────

    _setupInput() {
        this.input.on('pointermove', (pointer) => {
            if (!this.activeDragPiece || pointer.id !== this.activePointerId) return;
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
        this.activeDragSlot  = slotIndex;
        this.activePointerId = pointer.id;
        this.lastGhostKey    = null;

        this.audio.playPickup();
        triggerHaptic(12);

        container.setDepth(60).setScale(1.0);
        this.tweens.killTweensOf(container);
        container.x = pointer.x;
        container.y = pointer.y + FINGER_OFFSET_Y;
        this._updateGhost(container);
    }

    _dropPiece() {
        const piece    = this.activeDragPiece;
        const slotIdx  = this.activeDragSlot;

        this.activeDragPiece = null;
        this.activeDragSlot  = null;
        this.activePointerId = null;
        this.lastGhostKey    = null;
        this.ghostGraphics.setVisible(false);

        const coord = this._gridCoordOf(piece);
        if (coord && this._canPlace(piece.shapeData.cells, coord.col, coord.row)) {
            this._placePiece(slotIdx, piece, coord.col, coord.row);
        } else {
            this._returnToSlot(piece, slotIdx);
        }
    }

    _cancelDrop() {
        const piece   = this.activeDragPiece;
        const slotIdx = this.activeDragSlot;
        this.activeDragPiece = null;
        this.activeDragSlot  = null;
        this.activePointerId = null;
        this.lastGhostKey    = null;
        this.ghostGraphics.setVisible(false);
        this._returnToSlot(piece, slotIdx);
    }

    _returnToSlot(container, slotIndex) {
        const pos = SLOT_CONFIG[slotIndex];
        container.setDepth(20);
        this.tweens.add({
            targets: container,
            x: pos.x, y: pos.y,
            scaleX: SLOT_SCALE, scaleY: SLOT_SCALE,
            duration: 150, ease: 'Cubic.easeOut'
        });
    }

    // ─── Grid Coordinate Helper ──────────────────────────────────────

    _gridCoordOf(container) {
        const tlX = container.x + container.pieceOffsetX;
        const tlY = container.y + container.pieceOffsetY;
        const col = Math.round((tlX - GRID_START_X) / GRID_STEP);
        const row = Math.round((tlY - GRID_START_Y) / GRID_STEP);
        if (col >= -2 && col <= GRID_SIZE + 1 && row >= -2 && row <= GRID_SIZE + 1) {
            return { col, row };
        }
        return null;
    }

    // ─── Ghost Preview ───────────────────────────────────────────────

    _updateGhost(container) {
        const coord = this._gridCoordOf(container);
        if (coord && this._canPlace(container.shapeData.cells, coord.col, coord.row)) {
            const key = `${coord.col},${coord.row},${container.shapeData.color}`;
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
        shapeData.cells.forEach(([c, r]) => {
            const x = GRID_START_X + (targetCol + c) * GRID_STEP;
            const y = GRID_START_Y + (targetRow + r) * GRID_STEP;
            // Ghost: semi-transparent neon fill (30%) + bright border
            this.ghostGraphics.fillStyle(shapeData.color, 0.30);
            this.ghostGraphics.fillRoundedRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4, 4);
            this.ghostGraphics.lineStyle(1.5, 0xffffff, 0.85);
            this.ghostGraphics.strokeRoundedRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4, 4);
        });
    }

    // ─── Game Rules ─────────────────────────────────────────────────

    _canPlace(cells, targetCol, targetRow) {
        for (const [c, r] of cells) {
            const col = targetCol + c;
            const row = targetRow + r;
            if (col < 0 || col >= GRID_SIZE || row < 0 || row >= GRID_SIZE) return false;
            if (this.board[row][col] !== null) return false;
        }
        return true;
    }

    _placePiece(slotIndex, container, targetCol, targetRow) {
        const shapeData = container.shapeData;

        this.audio.playPlace();
        triggerHaptic(18);

        shapeData.cells.forEach(([c, r]) => {
            this.board[targetRow + r][targetCol + c] = shapeData.color;
        });

        this._renderBoardFills();
        this._addScore(shapeData.cells.length);

        container.destroy();
        this.slotContainers[slotIndex] = null;
        this.slotPieces[slotIndex]     = null;

        this._checkClearLines();

        if (this.slotPieces.every(p => p === null)) this.spawnSlotPieces();

        this._persistState();
        this._checkGameOver();
    }

    _checkClearLines() {
        const fullRows = [];
        const fullCols = [];

        for (let r = 0; r < GRID_SIZE; r++) {
            if (this.board[r].every(v => v !== null)) fullRows.push(r);
        }
        for (let c = 0; c < GRID_SIZE; c++) {
            if (this.board.every(row => row[c] !== null)) fullCols.push(c);
        }

        const total = fullRows.length + fullCols.length;
        if (total === 0) return;

        this.audio.playLineClear(total);
        triggerHaptic(total >= 2 ? [30, 40, 60] : 30);

        const toClear = new Set();
        fullRows.forEach(r => { for (let c = 0; c < GRID_SIZE; c++) toClear.add(`${r},${c}`); });
        fullCols.forEach(c => { for (let r = 0; r < GRID_SIZE; r++) toClear.add(`${r},${c}`); });

        const comboBonus = (total * (total + 1) / 2) * 10;
        const lineScore  = toClear.size + comboBonus;
        this._addScore(lineScore);

        if (total >= 2) this._floatText(`COMBO ×${total}! +${lineScore}`, 180, 265);

        // Flash cleared cells
        const flash = this.add.graphics().setDepth(15);
        toClear.forEach(key => {
            const [r, c] = key.split(',').map(Number);
            const x = GRID_START_X + c * GRID_STEP;
            const y = GRID_START_Y + r * GRID_STEP;
            flash.fillStyle(0xffffff, 0.92);
            flash.fillRoundedRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4, 4);
            this.board[r][c] = null;
        });

        this.tweens.add({
            targets: flash, alpha: 0, duration: 120, ease: 'Linear',
            onComplete: () => { flash.destroy(); this._renderBoardFills(); }
        });
    }

    _floatText(text, x, y) {
        const label = this.add.text(x, y, text, {
            fontFamily: FONT_INTER, fontSize: '16px', fontStyle: '900',
            color: '#facc15', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(70).setResolution(2);

        this.tweens.add({
            targets: label, y: y - 50, alpha: 0, scaleX: 1.25, scaleY: 1.25,
            duration: 650, ease: 'Back.easeOut',
            onComplete: () => label.destroy()
        });
    }

    // ─── Spawning ────────────────────────────────────────────────────

    spawnSlotPieces() {
        for (let i = 0; i < 3; i++) {
            if (this.slotPieces[i] !== null) continue;
            const shape = Phaser.Utils.Array.GetRandom(BLOCK_SHAPES);
            this.slotPieces[i] = shape;

            const conf      = SLOT_CONFIG[i];
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

    // ─── Game Over ───────────────────────────────────────────────────

    _checkGameOver() {
        // Dim pieces that can't be placed
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
        this.isGameOver = true;
        this.audio.playGameOver();
        triggerHaptic([60, 60, 100]);
        clearGameState();

        this.time.delayedCall(260, () => {
            this.finalScoreText.setText(`${this.score}`);
            const isRecord = this.score >= this.highScore && this.score > 0;
            this.newRecordBadge.setVisible(isRecord);
            this.gameOverContainer.setVisible(true).setAlpha(0);
            this.tweens.add({ targets: this.gameOverContainer, alpha: 1, duration: 200, ease: 'Linear' });
        });
    }

    _buildGameOverOverlay() {
        this.gameOverContainer = this.add.container(0, 0).setDepth(100).setVisible(false);

        // Dim
        const dim = this.add.graphics();
        dim.fillStyle(C.OVERLAY_DIM, 0.88);
        dim.fillRect(0, 0, 360, 640);
        this.gameOverContainer.add(dim);

        // Card
        const cardX = 28, cardY = 170, cardW = 304, cardH = 300;
        const card = this.add.graphics();
        // Card shadow
        card.fillStyle(C.BOARD_SHADOW_D, 1);
        card.fillRoundedRect(cardX + 4, cardY + 4, cardW, cardH, 20);
        // Card body
        card.fillStyle(C.CARD_BG, 1);
        card.fillRoundedRect(cardX, cardY, cardW, cardH, 20);
        card.lineStyle(1.5, C.CARD_BORDER, 0.6);
        card.strokeRoundedRect(cardX, cardY, cardW, cardH, 20);
        this.gameOverContainer.add(card);

        // Title
        const title = this.add.text(180, 200, 'GAME OVER', {
            fontFamily: FONT_RETRO, fontSize: '14px', color: '#f43f5e'
        }).setOrigin(0.5).setResolution(2);
        this.gameOverContainer.add(title);

        const sub = this.add.text(180, 228, 'Tidak ada tempat lagi untuk balok!', {
            fontFamily: FONT_INTER, fontSize: '11px', color: '#64748b'
        }).setOrigin(0.5).setResolution(2);
        this.gameOverContainer.add(sub);

        // Score box
        const sb = this.add.graphics();
        sb.fillStyle(C.BOARD_INNER, 1);
        sb.fillRoundedRect(52, 252, 256, 72, 12);
        sb.lineStyle(1, C.PILL_BORDER, 0.5);
        sb.strokeRoundedRect(52, 252, 256, 72, 12);
        this.gameOverContainer.add(sb);

        const slabel = this.add.text(180, 266, 'SKOR AKHIR', {
            fontFamily: FONT_INTER, fontSize: '10px', fontStyle: 'bold',
            color: '#4a6080', letterSpacing: 2
        }).setOrigin(0.5).setResolution(2);
        this.gameOverContainer.add(slabel);

        this.finalScoreText = this.add.text(180, 292, '0', {
            fontFamily: FONT_INTER, fontSize: '28px', fontStyle: '900', color: '#e2e8f0'
        }).setOrigin(0.5).setResolution(2);
        this.gameOverContainer.add(this.finalScoreText);

        this.newRecordBadge = this.add.text(180, 340, '🎉 REKOR BARU! 🎉', {
            fontFamily: FONT_INTER, fontSize: '11px', fontStyle: 'bold', color: '#facc15'
        }).setOrigin(0.5).setVisible(false).setResolution(2);
        this.gameOverContainer.add(this.newRecordBadge);

        // Play Again button
        const btn = this.add.graphics();
        btn.fillStyle(C.BTN_BG, 1);
        btn.fillRoundedRect(52, 380, 256, 50, 12);
        btn.lineStyle(1.5, C.BTN_BORDER, 0.8);
        btn.strokeRoundedRect(52, 380, 256, 50, 12);
        this.gameOverContainer.add(btn);

        const btnTxt = this.add.text(180, 405, 'MAIN LAGI  🚀', {
            fontFamily: FONT_INTER, fontSize: '14px', fontStyle: 'bold', color: '#ffffff'
        }).setOrigin(0.5).setResolution(2);
        this.gameOverContainer.add(btnTxt);

        const hitZone = this.add.zone(180, 405, 256, 50).setInteractive({ useHandCursor: true });
        this.gameOverContainer.add(hitZone);
        hitZone.on('pointerdown', () => this._resetGame());
    }

    // ─── Score & Persistence ─────────────────────────────────────────

    _addScore(points) {
        this.score += points;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            saveHighScore(this.highScore);
        }
        this._syncScoreUI();
    }

    _syncScoreUI() {
        this.scoreValueText.setText(`${this.score}`);
        this.highScoreValueText.setText(`${this.highScore}`);
    }

    _persistState() {
        if (!this.isGameOver) {
            saveGameState({ score: this.score, board: this.board, slotPieces: this.slotPieces });
        }
    }

    _restoreSession() {
        const state = loadGameState();
        if (!state?.board) return false;

        this.score = state.score || 0;
        this.board = state.board;
        this._renderBoardFills();

        if (state.slotPieces?.some(p => p !== null)) {
            this.slotPieces = state.slotPieces;
            for (let i = 0; i < 3; i++) {
                const shape = this.slotPieces[i];
                if (!shape) continue;
                const conf      = SLOT_CONFIG[i];
                const container = this._createPieceContainer(shape, SLOT_SCALE);
                container.setPosition(conf.x, conf.y);
                this.slotContainers[i] = container;
            }
        } else {
            this.spawnSlotPieces();
        }

        this._checkGameOver();
        return true;
    }

    _resetGame() {
        this.isGameOver = false;
        this.gameOverContainer.setVisible(false);
        this.score = 0;
        this._syncScoreUI();

        for (let r = 0; r < GRID_SIZE; r++) this.board[r].fill(null);
        this._renderBoardFills();

        for (let i = 0; i < 3; i++) {
            this.slotContainers[i]?.destroy();
            this.slotContainers[i] = null;
            this.slotPieces[i]     = null;
        }

        clearGameState();
        this.spawnSlotPieces();
    }
}
