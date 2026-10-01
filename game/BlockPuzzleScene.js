import Phaser from 'phaser';
import { BLOCK_SHAPES } from './BlockShapes.js';
import {
    GRID_SIZE, CELL_SIZE, CELL_GAP, GRID_STEP,
    GRID_START_X, GRID_START_Y,
    BOARD_X, BOARD_Y, BOARD_W, BOARD_H,
    FINGER_OFFSET_Y,
    SLOT_CONFIG, SLOT_SCALE,
    FONT_PIXEL, FONT_POPPINS, FONT_RETRO,
    C
} from './Constants.js';
import { RetroAudio, triggerHaptic } from './Audio.js';
import {
    getHighScore, saveHighScore,
    saveGameState, loadGameState, clearGameState
} from './Storage.js';

export class BlockPuzzleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BlockPuzzleScene' });
        this.audio = new RetroAudio();
    }

    preload() {
        this.load.image('mahkota', '/mahkota icon.png');
        this.load.image('pause', '/pause.png');
    }

    create() {
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

        if (!this._restoreSession()) this.spawnSlotPieces();
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

        // Skor (kiri)
        this.scoreValueText = this.add.text(95, centerY, '0', {
            fontFamily: FONT_PIXEL, fontSize: '25px',
            color: '#091F4F'
        }).setOrigin(0.5, 0.5).setResolution(3);

        // Mahkota (tengah)
        this.crownIcon = this.add.image(180, centerY, 'mahkota')
            .setScale(0.06)
            .setOrigin(0.5, 0.5);

        // Skor Terbaik (kanan)
        this.highScoreValueText = this.add.text(275, centerY, `${this.highScore}`, {
            fontFamily: FONT_PIXEL, fontSize: '25px',
            color: '#D39840'
        }).setOrigin(0.5, 0.5).setResolution(3);

        // Pause button (pojok kiri atas)
        this.pauseBtn = this.add.image(300, -12, 'pause')
            .setScale(0.028)
            .setOrigin(0, 0)
            .setInteractive({ useHandCursor: true })
            .setDepth(10);

        this.pauseBtn.on('pointerdown', () => {
            if (!this.isGameOver && !this.isPaused) this._togglePause(true);
        });
    }

    // ── Board 10×10 ─────────────────────────────────────────

    _buildBoard() {
        const g = this.add.graphics();

        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const cx = GRID_START_X + c * GRID_STEP;
                const cy = GRID_START_Y + r * GRID_STEP;
                g.fillStyle(C.CELL_EMPTY, 1);
                g.fillRect(cx, cy, CELL_SIZE, CELL_SIZE);
            }
        }

        this.boardFillGraphics = this.add.graphics();
    }

    _renderBoardFills() {
        this.boardFillGraphics.clear();
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const color = this.board[r][c];
                if (color !== null) {
                    const x = GRID_START_X + c * GRID_STEP;
                    const y = GRID_START_Y + r * GRID_STEP;
                    this._drawPixelCell(this.boardFillGraphics, x, y, color, 1);
                }
            }
        }
    }

    // ── Slot Cards (3 pilihan balok bawah) ───────────────────

    _buildSlotCards() {
        for (let i = 0; i < 3; i++) {
            const conf = SLOT_CONFIG[i];

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
        // Solid flat pixel block
        g.fillStyle(color, alpha);
        g.fillRect(x, y, CELL_SIZE, CELL_SIZE);

        // Pixel highlight (top + left edge, 2px)
        g.fillStyle(0xffffff, alpha * 0.35);
        g.fillRect(x, y, CELL_SIZE, 2);       // top
        g.fillRect(x, y, 2, CELL_SIZE);       // left

        // Pixel shadow (bottom + right edge, 2px)
        g.fillStyle(0x000000, alpha * 0.25);
        g.fillRect(x, y + CELL_SIZE - 2, CELL_SIZE, 2);  // bottom
        g.fillRect(x + CELL_SIZE - 2, y, 2, CELL_SIZE);  // right

        // Inner shadow (bagian dalam atas-kiri, efek kedalaman)
        g.fillStyle(0x000000, alpha * 0.08);
        g.fillRect(x + 2, y + 2, CELL_SIZE - 4, 3);      // inner top
        g.fillRect(x + 2, y + 2, 3, CELL_SIZE - 4);      // inner left

        // Inner highlight (bagian dalam bawah-kanan, efek cahaya)
        g.fillStyle(0xffffff, alpha * 0.1);
        g.fillRect(x + 2, y + CELL_SIZE - 5, CELL_SIZE - 4, 3);  // inner bottom
        g.fillRect(x + CELL_SIZE - 5, y + 2, 3, CELL_SIZE - 4);  // inner right
    }

    // ── Pixel Card Helper ───────────────────────────────────

    _drawPixelCard(g, x, y, w, h, bgColor = 0xffffff) {
        // Card body
        g.fillStyle(bgColor, 1);
        g.fillRect(x, y, w, h);

        // Pixel bevel: highlight atas & kiri
        g.fillStyle(0xffffff, 0.4);
        g.fillRect(x, y, w, 3);
        g.fillRect(x, y, 3, h);

        // Pixel bevel: shadow bawah & kanan
        g.fillStyle(0x000000, 0.3);
        g.fillRect(x, y + h - 3, w, 3);
        g.fillRect(x + w - 3, y, 3, h);

        // Border luar 1px
        g.lineStyle(1, 0x334155, 0.6);
        g.strokeRect(x, y, w, h);
    }

    // ── Pixel Button Helper ─────────────────────────────────

    _drawPixelButton(g, x, y, w, h, bgColor = C.BTN_BG) {
        g.fillStyle(bgColor, 1);
        g.fillRect(x, y, w, h);
        // Highlight
        g.fillStyle(0xffffff, 0.25);
        g.fillRect(x, y, w, 2);
        g.fillRect(x, y, 2, h);
        // Shadow
        g.fillStyle(0x000000, 0.3);
        g.fillRect(x, y + h - 2, w, 2);
        g.fillRect(x + w - 2, y, 2, h);
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
        shapeData.cells.forEach(([c, r]) => {
            const bx = container.pieceOffsetX + c * GRID_STEP;
            const by = container.pieceOffsetY + r * GRID_STEP;
            this._drawPixelCell(g, bx, by, shapeData.color, 1);
        });

        container.add(g);
        container.setScale(scale).setDepth(20);
        return container;
    }

    // ── Input ───────────────────────────────────────────────

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

        const coord = this._gridCoordOf(piece);
        if (coord && this._canPlace(piece.shapeData.cells, coord.col, coord.row)) {
            this._placePiece(slotIdx, piece, coord.col, coord.row);
        } else {
            this._returnToSlot(piece, slotIdx);
        }
    }

    _cancelDrop() {
        const piece = this.activeDragPiece;
        const slotIdx = this.activeDragSlot;
        this.activeDragPiece = null;
        this.activeDragSlot = null;
        this.activePointerId = null;
        this.lastGhostKey = null;
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

    // ── Grid Helpers ────────────────────────────────────────

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
            this.ghostGraphics.fillStyle(shapeData.color, 0.35);
            this.ghostGraphics.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        });
    }

    _canPlace(cells, targetCol, targetRow) {
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
        const shapeData = container.shapeData;

        this.audio.playPlace();
        triggerHaptic(18);

        shapeData.cells.forEach(([c, r]) => {
            this.board[targetRow + r][targetCol + c] = shapeData.color;
        });

        this._renderBoardFills();
        this._addScore(shapeData.cells.length);

        // Efek: mini pop saat menaruh balok
        this._spawnPlaceParticles(targetCol, targetRow, shapeData);

        container.destroy();
        this.slotContainers[slotIndex] = null;
        this.slotPieces[slotIndex] = null;

        const linesCleared = this._checkClearLines();

        // Crown shake: besar saat line clear, kecil saat place biasa
        this._shakeCrown(linesCleared ? 'big' : 'small');

        if (this.slotPieces.every(p => p === null)) this.spawnSlotPieces();

        this._persistState();
        this._checkGameOver();
    }

    // ── Efek partikel saat menaruh balok ─────────────────────

    _spawnPlaceParticles(col, row, shapeData) {
        const centerX = GRID_START_X + col * GRID_STEP + (CELL_SIZE / 2);
        const centerY = GRID_START_Y + row * GRID_STEP + (CELL_SIZE / 2);
        const count = 6;

        for (let i = 0; i < count; i++) {
            const particle = this.add.graphics().setDepth(50);
            const size = Phaser.Math.Between(2, 5);
            particle.fillStyle(shapeData.color, 1);
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
        if (total === 0) {
            this.comboStreak = 0;
            return false;
        }

        this.comboStreak++;
        this.audio.playLineClear(total);
        triggerHaptic(total >= 2 ? [30, 40, 60] : 30);

        const toClear = new Set();
        fullRows.forEach(r => { for (let c = 0; c < GRID_SIZE; c++) toClear.add(`${r},${c}`); });
        fullCols.forEach(c => { for (let r = 0; r < GRID_SIZE; r++) toClear.add(`${r},${c}`); });

        const comboBonus = (total * (total + 1) / 2) * 10;
        const streakBonus = this.comboStreak > 1 ? this.comboStreak * 5 : 0;
        const lineScore = toClear.size + comboBonus + streakBonus;
        this._addScore(lineScore);

        // Efek: screen shake
        this.cameras.main.shake(120, total >= 2 ? 0.008 : 0.004);

        // Efek: floating text
        if (total >= 2) {
            this._floatText(`COMBO ×${total}!`, 180, 260);
        }
        if (this.comboStreak > 1) {
            this._floatText(`STREAK ×${this.comboStreak}!`, 180, 285);
        }
        this._floatText(`+${lineScore}`, 180, total >= 2 ? 310 : 265);

        // Efek: flash + pixel particles
        const flash = this.add.graphics().setDepth(15);
        toClear.forEach(key => {
            const [r, c] = key.split(',').map(Number);
            const x = GRID_START_X + c * GRID_STEP;
            const y = GRID_START_Y + r * GRID_STEP;
            flash.fillStyle(0xffffff, 0.92);
            flash.fillRect(x, y, CELL_SIZE, CELL_SIZE);

            this._spawnClearParticle(x, y, this.board[r][c] || 0xcbd5e1);
            this.board[r][c] = null;
        });

        this.tweens.add({
            targets: flash, alpha: 0, duration: 150, ease: 'Linear',
            onComplete: () => { flash.destroy(); this._renderBoardFills(); }
        });

        return true;
    }

    // ── Partikel pixel saat baris/kolom bersih ───────────────

    _spawnClearParticle(x, y, color) {
        const count = 3;
        for (let i = 0; i < count; i++) {
            const p = this.add.graphics().setDepth(50);
            const sz = Phaser.Math.Between(2, 4);
            p.fillStyle(color, 1);
            p.fillRect(0, 0, sz, sz);
            p.setPosition(x + Math.random() * CELL_SIZE, y + Math.random() * CELL_SIZE);

            this.tweens.add({
                targets: p,
                y: p.y - Phaser.Math.Between(20, 50),
                x: p.x + Phaser.Math.Between(-15, 15),
                alpha: 0,
                duration: Phaser.Math.Between(250, 450),
                ease: 'Cubic.easeOut',
                onComplete: () => p.destroy()
            });
        }
    }

    // ── Floating Score Text ─────────────────────────────────

    _floatText(text, x, y) {
        const label = this.add.text(x, y, text, {
            fontFamily: FONT_PIXEL, fontSize: '10px',
            color: '#facc15', stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(70).setResolution(2);

        this.tweens.add({
            targets: label, y: y - 40, alpha: 0, scaleX: 1.15, scaleY: 1.15,
            duration: 700, ease: 'Back.easeOut',
            onComplete: () => label.destroy()
        });
    }

    // ── Spawn 3 balok ───────────────────────────────────────

    spawnSlotPieces() {
        for (let i = 0; i < 3; i++) {
            if (this.slotPieces[i] !== null) continue;
            const shape = Phaser.Utils.Array.GetRandom(BLOCK_SHAPES);
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

        this.cameras.main.shake(400, 0.012);

        this.time.delayedCall(400, () => {
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

    // ── Game Over Overlay (Pixel Card) ──────────────────────

    _buildGameOverOverlay() {
        this.gameOverContainer = this.add.container(0, 0).setDepth(100).setVisible(false);

        // Dim
        const dim = this.add.graphics();
        dim.fillStyle(0x000000, 0.55);
        dim.fillRect(0, 0, 360, 640);
        this.gameOverContainer.add(dim);

        // Pixel Card
        const cardX = 40, cardY = 160, cardW = 280, cardH = 300;
        const card = this.add.graphics();
        this._drawPixelCard(card, cardX, cardY, cardW, cardH, 0xf8fafc);
        this.gameOverContainer.add(card);

        // Title
        const title = this.add.text(180, 195, 'GAME OVER', {
            fontFamily: FONT_PIXEL, fontSize: '14px', color: '#f43f5e'
        }).setOrigin(0.5).setResolution(2);
        this.gameOverContainer.add(title);

        // Mahkota icon
        const goCrown = this.add.image(180, 245, 'mahkota').setScale(0.09);
        this.gameOverContainer.add(goCrown);

        // Skor akhir
        this.finalScoreText = this.add.text(180, 300, '0', {
            fontFamily: FONT_PIXEL, fontSize: '28px', color: '#091F4F'
        }).setOrigin(0.5).setResolution(3);
        this.gameOverContainer.add(this.finalScoreText);

        // Rekor baru badge
        this.newRecordBadge = this.add.text(180, 338, 'REKOR BARU!', {
            fontFamily: FONT_PIXEL, fontSize: '8px', color: '#f59e0b'
        }).setOrigin(0.5).setVisible(false).setResolution(2);
        this.gameOverContainer.add(this.newRecordBadge);

        // Tombol Main Lagi (pixel style)
        const btnW = 200, btnH = 40;
        const btnX = 180 - btnW / 2, btnY = 395;
        const btn = this.add.graphics();
        this._drawPixelButton(btn, btnX, btnY, btnW, btnH, C.BTN_BG);
        this.gameOverContainer.add(btn);

        const btnTxt = this.add.text(180, btnY + btnH / 2, 'MAIN LAGI', {
            fontFamily: FONT_PIXEL, fontSize: '10px', color: '#ffffff'
        }).setOrigin(0.5).setResolution(2);
        this.gameOverContainer.add(btnTxt);

        const hitZone = this.add.zone(180, btnY + btnH / 2, btnW, btnH)
            .setInteractive({ useHandCursor: true });
        this.gameOverContainer.add(hitZone);
        hitZone.on('pointerdown', () => this._resetGame());
    }

    // ── Pause Overlay (Pixel Card) ──────────────────────────

    _buildPauseOverlay() {
        this.pauseContainer = this.add.container(0, 0).setDepth(100).setVisible(false);

        // Dim
        const dim = this.add.graphics();
        dim.fillStyle(0x000000, 0.55);
        dim.fillRect(0, 0, 360, 640);
        this.pauseContainer.add(dim);

        // Pixel Card
        const cardX = 55, cardY = 200, cardW = 250, cardH = 220;
        const card = this.add.graphics();
        this._drawPixelCard(card, cardX, cardY, cardW, cardH, 0xf8fafc);
        this.pauseContainer.add(card);

        // Pause icon di card
        const pauseIcon = this.add.image(180, 240, 'pause').setScale(0.05);
        this.pauseContainer.add(pauseIcon);

        // Tombol Lanjut
        const btn1W = 180, btn1H = 36;
        const btn1X = 180 - btn1W / 2, btn1Y = 280;
        const btn1 = this.add.graphics();
        this._drawPixelButton(btn1, btn1X, btn1Y, btn1W, btn1H, 0x22c55e);
        this.pauseContainer.add(btn1);

        const btn1Txt = this.add.text(180, btn1Y + btn1H / 2, 'LANJUT', {
            fontFamily: FONT_PIXEL, fontSize: '9px', color: '#ffffff'
        }).setOrigin(0.5).setResolution(2);
        this.pauseContainer.add(btn1Txt);

        const hit1 = this.add.zone(180, btn1Y + btn1H / 2, btn1W, btn1H)
            .setInteractive({ useHandCursor: true });
        this.pauseContainer.add(hit1);
        hit1.on('pointerdown', () => this._togglePause(false));

        // Tombol Mulai Ulang
        const btn2Y = btn1Y + btn1H + 16;
        const btn2 = this.add.graphics();
        this._drawPixelButton(btn2, btn1X, btn2Y, btn1W, btn1H, 0xf43f5e);
        this.pauseContainer.add(btn2);

        const btn2Txt = this.add.text(180, btn2Y + btn1H / 2, 'MULAI ULANG', {
            fontFamily: FONT_PIXEL, fontSize: '9px', color: '#ffffff'
        }).setOrigin(0.5).setResolution(2);
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
                const conf = SLOT_CONFIG[i];
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
        this.isPaused = false;
        this.comboStreak = 0;
        this.gameOverContainer.setVisible(false);
        this.pauseContainer.setVisible(false);
        this.score = 0;
        this._syncScoreUI();

        for (let r = 0; r < GRID_SIZE; r++) this.board[r].fill(null);
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
