import Phaser from 'phaser';
import {
    ACTIVE_COLORS,
    COLOR_RAINBOW,
    COLOR_BOMB,
    POOL_1,
    POOL_2,
    POOL_3,
    POOL_4,
    POOL_5,
    shapeKey
} from '../data/BlockShapes.js';
import {
    DPR,
    GRID_SIZE, CELL_SIZE, CELL_GAP, GRID_STEP,
    GRID_START_X, GRID_START_Y,
    BOARD_X, BOARD_Y, BOARD_W, BOARD_H,
    FINGER_OFFSET_Y,
    SLOT_CONFIG, SLOT_SCALE,
    FONT_PIXEL, FONT_UI,
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
        this.load.image('logo-bps', '/assets/logo-bps-clean.png');
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
        // High-DPI Camera scaling: renders full scene at crisp native display resolution
        const dpr = this.game.config.width / 360;
        this.cameras.main.setZoom(dpr);
        this.cameras.main.centerOn(180, 320);

        const maskG = this.make.graphics();
        maskG.fillStyle(0xffffff, 1);
        maskG.fillRoundedRect(0, 0, CELL_SIZE, CELL_SIZE, 5);
        maskG.generateTexture('cell-mask', CELL_SIZE, CELL_SIZE);
        maskG.destroy();

        // Enable crisp bilinear filter for high-res BPS logo to eliminate pixelated/blur artifacts
        if (this.textures.exists('logo-bps')) {
            this.textures.get('logo-bps').setFilter(Phaser.Textures.FilterMode.LINEAR);
        }

        this.score = 0;
        this.highScore = getHighScore();
        this.isGameOver = false;
        this.isPaused = false;
        this.comboStreak = 0;

        this.feverGauge = 0;
        this.isFeverActive = false;
        this.feverTurnsLeft = 0;

        this.activeDragPiece = null;
        this.activeDragSlot = null;
        this.activePointerId = null;
        this.lastGhostKey = null;

        this.board = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
        // Parallel board tracking which cells use sprite rendering
        this.boardSprite = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
        // Parallel board tracking special block types ('rainbow' | 'bomb' | null)
        this.boardSpecial = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));

        this.slotPieces = [null, null, null];
        this.slotContainers = [null, null, null];
        this.unlockedMilestones = new Set();

        this._buildBackground();
        this._buildHeader();
        this._buildFeverGauge();
        this._buildBoard();
        this._buildSlotCards();
        this._buildGhostLayer();
        this._buildMilestoneBanner();
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

    // ── Header: Grup BPS (Logo + 2 Teks) — Kontrol — Skor — Mahkota — Rekor ────────────────

    _buildHeader() {
        const topY = 20;    // Baris atas: Grup BPS (Logo + Teks) & Tombol Kontrol
        const scoreY = 62;  // Baris tengah: Skor, Mahkota, dan Rekor

        // 1. Logo BPS (kiri atas, proporsional, tajam & bersih)
        this.bpsLogo = this.add.image(18, topY, 'logo-bps')
            .setDisplaySize(34, 26)
            .setOrigin(0, 0.5)
            .setDepth(25);

        // 2. Teks Grup BPS (di samping logo BPS, font Inter resolusi tinggi)
        this.bpsTitle = this.add.text(58, topY - 7, 'BPS', {
            fontFamily: FONT_UI,
            fontSize: '16px',
            fontStyle: '750',
            color: C.SCORE_VAL
        }).setOrigin(0, 0.5).setResolution(3).setDepth(25);

        this.bpsSubtitle = this.add.text(58, topY + 7, 'Badan Pusat Statistik', {
            fontFamily: FONT_UI,
            fontSize: '9.5px',
            fontStyle: '300',
            color: C.SCORE_VAL
        }).setOrigin(0, 0.5).setResolution(3).setDepth(25);

        // 3. Tombol Audio (kanan atas, sejajar dengan Grup BPS)
        this.audioBtn = this.add.container(288, topY).setDepth(25);
        
        const audioBg = this.add.graphics();
        audioBg.fillStyle(0xffffff, 1);
        audioBg.fillRoundedRect(-15, -15, 30, 30, 8);
        audioBg.lineStyle(1, C.CELL_BORDER, 0.8);
        audioBg.strokeRoundedRect(-15, -15, 30, 30, 8);
        this.audioBtn.add(audioBg);

        this.audioIconGraphics = this.add.graphics();
        this.audioBtn.add(this.audioIconGraphics);
        this._drawAudioIcon();

        const audioZone = this.add.zone(0, 0, 34, 34)
            .setInteractive({ useHandCursor: true });
        this.audioBtn.add(audioZone);

        audioZone.on('pointerdown', () => {
            const isMuted = this.audio.toggleMute();
            this._drawAudioIcon();
            triggerHaptic(15);
            
            // Pop button animation
            this.tweens.killTweensOf(this.audioBtn);
            this.audioBtn.setScale(0.85);
            this.tweens.add({
                targets: this.audioBtn,
                scaleX: 1, scaleY: 1,
                duration: 150, ease: 'Back.easeOut'
            });

            this._floatText(isMuted ? 'SUARA: MATI' : 'SUARA: AKTIF', 288, 48);
        });

        // 4. Tombol Pause (paling kanan atas)
        this.pauseBtn = this.add.container(330, topY).setDepth(25);
        
        const pauseBg = this.add.graphics();
        pauseBg.fillStyle(0xffffff, 1);
        pauseBg.fillRoundedRect(-15, -15, 30, 30, 8);
        pauseBg.lineStyle(1, C.CELL_BORDER, 0.8);
        pauseBg.strokeRoundedRect(-15, -15, 30, 30, 8);
        this.pauseBtn.add(pauseBg);

        this.pauseIconGraphics = this.add.graphics();
        this.pauseIconGraphics.fillStyle(0x1e293b, 1);
        this.pauseIconGraphics.fillRect(-4, -5, 2.5, 10);
        this.pauseIconGraphics.fillRect(1.5, -5, 2.5, 10);
        this.pauseBtn.add(this.pauseIconGraphics);

        const pauseZone = this.add.zone(0, 0, 34, 34)
            .setInteractive({ useHandCursor: true });
        this.pauseBtn.add(pauseZone);

        pauseZone.on('pointerdown', () => {
            if (!this.isGameOver && !this.isPaused) {
                this.tweens.killTweensOf(this.pauseBtn);
                this.pauseBtn.setScale(0.85);
                this.tweens.add({
                    targets: this.pauseBtn,
                    scaleX: 1, scaleY: 1,
                    duration: 150, ease: 'Back.easeOut'
                });
                this._togglePause(true);
            }
        });

        // 5. Score Value (kiri-tengah) — Teks angka saja, jernih & tajam
        const scoreBoxX = 100;
        this.scoreValueText = this.add.text(scoreBoxX, scoreY, '0', {
            fontFamily: FONT_PIXEL,
            fontSize: '18px',
            color: C.SCORE_VAL
        }).setOrigin(0.5, -0.4).setResolution(4);

        // 6. Mahkota / Crown Icon (tengah)
        this.crownIcon = this.add.image(180, scoreY, 'mahkota')
            .setScale(0.05)
            .setOrigin(0.5, 0.4);

        // 7. Skor Terbaik Value (kanan-tengah) — Teks angka saja, jernih & tajam
        const bestBoxX = 260;
        this.highScoreValueText = this.add.text(bestBoxX, scoreY, `${this.highScore}`, {
            fontFamily: FONT_PIXEL,
            fontSize: '18px',
            color: C.BEST_VAL
        }).setOrigin(0.5, -0.4).setResolution(4);
    }

    _drawAudioIcon() {
        if (!this.audioIconGraphics) return;
        this.audioIconGraphics.clear();
        const isMuted = this.audio.getIsMuted();

        const color = isMuted ? 0x94a3b8 : 0x1e293b;
        this.audioIconGraphics.fillStyle(color, 1);

        // Speaker Cone Body
        this.audioIconGraphics.fillRect(-6, -3, 3, 6);
        this.audioIconGraphics.fillTriangle(-3, -3, -3, 3, 2, 6);
        this.audioIconGraphics.fillTriangle(-3, -3, 2, 6, 2, -6);

        if (isMuted) {
            // Mute Cross / Slash in bright red
            this.audioIconGraphics.lineStyle(2, 0xef4444, 1);
            this.audioIconGraphics.lineBetween(-7, 7, 7, -7);
        } else {
            // Sound Waves (arcs)
            this.audioIconGraphics.lineStyle(1.5, 0x3b82f6, 1);
            this.audioIconGraphics.beginPath();
            this.audioIconGraphics.arc(1, 0, 4, -Math.PI / 3, Math.PI / 3, false);
            this.audioIconGraphics.strokePath();

            this.audioIconGraphics.beginPath();
            this.audioIconGraphics.arc(1, 0, 7, -Math.PI / 3, Math.PI / 3, false);
            this.audioIconGraphics.strokePath();
        }
    }

    // ── Fever / Hyper Gauge UI ──────────────────────────────

    _buildFeverGauge() {
        this.feverContainer = this.add.container(180, 120).setDepth(20);

        const trackW = 180, trackH = 9;
        const trackX = -trackW / 2, trackY = -trackH / 2;

        this.feverTrackGraphics = this.add.graphics();
        this.feverTrackGraphics.fillStyle(0xe2e8f0, 1);
        this.feverTrackGraphics.fillRoundedRect(trackX, trackY, trackW, trackH, 4);
        this.feverTrackGraphics.lineStyle(1, 0xcbd5e1, 1);
        this.feverTrackGraphics.strokeRoundedRect(trackX, trackY, trackW, trackH, 4);
        this.feverContainer.add(this.feverTrackGraphics);

        this.feverBarGraphics = this.add.graphics();
        this.feverContainer.add(this.feverBarGraphics);

        this.feverLabel = this.add.text(0, -15, 'FEVER GAUGE', {
            fontFamily: FONT_PIXEL,
            fontSize: '8px',
            color: '#94a3b8'
        }).setOrigin(0.5, 0.5).setResolution(4);
        this.feverContainer.add(this.feverLabel);

        // Burning golden aura around board
        this.feverAuraBorder = this.add.graphics().setDepth(0).setVisible(false);

        this._drawFeverBar();
    }

    _drawFeverBar() {
        this.feverBarGraphics.clear();
        const trackW = 180, trackH = 9;
        const trackX = -trackW / 2, trackY = -trackH / 2;
        const pct = Math.max(0, Math.min(100, this.feverGauge)) / 100;
        const fillW = Math.max(0, (trackW - 2) * pct);

        if (fillW > 0) {
            if (this.isFeverActive) {
                // Fiery blazing bar
                this.feverBarGraphics.fillStyle(0xf59e0b, 1);
                this.feverBarGraphics.fillRoundedRect(trackX + 1, trackY + 1, fillW, trackH - 2, 3);
                this.feverBarGraphics.fillStyle(0xfef08a, 0.55);
                this.feverBarGraphics.fillRoundedRect(trackX + 1, trackY + 1, fillW, (trackH - 2) / 2, { tl: 3, tr: 3, bl: 0, br: 0 });
                this.feverLabel.setText(`🔥 FEVER 2X (${this.feverTurnsLeft} GERAKAN) 🔥`).setColor('#ea580c');
            } else {
                // Blue to Amber charging bar
                this.feverBarGraphics.fillStyle(pct >= 0.8 ? 0xf59e0b : 0x3b82f6, 1);
                this.feverBarGraphics.fillRoundedRect(trackX + 1, trackY + 1, fillW, trackH - 2, 3);
                this.feverBarGraphics.fillStyle(0xffffff, 0.3);
                this.feverBarGraphics.fillRoundedRect(trackX + 1, trackY + 1, fillW, (trackH - 2) / 2, { tl: 3, tr: 3, bl: 0, br: 0 });
                this.feverLabel.setText(pct >= 1 ? '⚡ FEVER SIAP! ⚡' : 'FEVER GAUGE').setColor(pct >= 0.8 ? '#d97706' : '#94a3b8');
            }
        } else {
            this.feverLabel.setText('FEVER GAUGE').setColor('#94a3b8');
        }
    }

    _updateFever(amount) {
        if (this.isFeverActive) return;

        this.feverGauge = Math.min(100, this.feverGauge + amount);
        this._drawFeverBar();

        if (this.feverGauge >= 100) {
            this._activateFeverMode();
        }
    }

    _activateFeverMode() {
        this.isFeverActive = true;
        this.feverTurnsLeft = 6;
        this.feverGauge = 100;
        this.audio.playFeverStart();
        triggerHaptic([40, 40, 80]);

        this.cameras.main.shake(200, 0.008);
        this._floatText('🔥 FEVER MODE 2X! 🔥', 180, 240);
        this._spawnConfetti();

        // Fiery pulsing board border
        this.feverAuraBorder.clear();
        this.feverAuraBorder.setVisible(true).setAlpha(0.85);
        this.feverAuraBorder.lineStyle(4, 0xf59e0b, 0.85);
        this.feverAuraBorder.strokeRoundedRect(BOARD_X - 4, BOARD_Y - 4, BOARD_W + 8, BOARD_H + 8, 8);

        this.tweens.killTweensOf(this.feverAuraBorder);
        this.tweens.add({
            targets: this.feverAuraBorder,
            alpha: { from: 0.95, to: 0.35 },
            yoyo: true,
            repeat: -1,
            duration: 380,
            ease: 'Sine.easeInOut'
        });

        this._drawFeverBar();
    }

    _deactivateFeverMode() {
        this.isFeverActive = false;
        this.feverTurnsLeft = 0;
        this.feverGauge = 0;
        this.tweens.killTweensOf(this.feverAuraBorder);
        this.feverAuraBorder.setVisible(false);
        this._drawFeverBar();
        this._floatText('FEVER OVER', 180, 240);
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
                    const special = this.boardSpecial[r][c];

                    if (special === 'rainbow') {
                        this._drawPixelCell(this.boardFillGraphics, x, y, color, 1, 'rainbow');
                    } else if (special === 'bomb') {
                        this._drawPixelCell(this.boardFillGraphics, x, y, color, 1, 'bomb');
                    } else if (this.boardSprite[r][c]) {
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

    // ── Pixel Cell Renderer (dengan inner shadow & special block support) ──

    _drawPixelCell(g, x, y, color, alpha = 1, specialType = null) {
        if (specialType === 'rainbow') {
            // 🌈 Rainbow Wildcard: Multi-color prismatic star badge
            // Base rounded background tile (Deep indigo)
            g.fillStyle(0x1e1b4b, alpha);
            g.fillRoundedRect(x, y, CELL_SIZE, CELL_SIZE, 6);

            // Shimmering outer border
            g.lineStyle(1.5, 0xfacc15, alpha);
            g.strokeRoundedRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2, 5);

            // 4 Vivid Rainbow Quadrants / Prisms
            const half = CELL_SIZE / 2;
            const pad = 3;
            const sz = half - pad;
            // Top-left: Red
            g.fillStyle(0xef4444, alpha);
            g.fillRect(x + pad, y + pad, sz, sz);
            // Top-right: Yellow
            g.fillStyle(0xfacc15, alpha);
            g.fillRect(x + half, y + pad, sz, sz);
            // Bottom-left: Green
            g.fillStyle(0x22c55e, alpha);
            g.fillRect(x + pad, y + half, sz, sz);
            // Bottom-right: Blue
            g.fillStyle(0x3b82f6, alpha);
            g.fillRect(x + half, y + half, sz, sz);

            // Center: 8-Bit Sparkling White Star / Cross
            const cx = x + half, cy = y + half;
            g.fillStyle(0xffffff, alpha);
            // Core
            g.fillRect(cx - 2, cy - 2, 4, 4);
            // Rays
            g.fillRect(cx - 1, cy - 5, 2, 10);
            g.fillRect(cx - 5, cy - 1, 10, 2);
            // Star glint corners
            g.fillStyle(0xfef08a, alpha);
            g.fillRect(cx - 1, cy - 1, 2, 2);
        } else if (specialType === 'bomb') {
            // 💣 Classic Retro Arcade Bomb — with active colored tile background!
            const baseColor = color || 0xef4444;
            g.fillStyle(baseColor, alpha);
            g.fillRoundedRect(x, y, CELL_SIZE, CELL_SIZE, 6);

            // Warning red inner border
            g.lineStyle(1.5, 0xef4444, alpha * 0.9);
            g.strokeRoundedRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2, 5);

            const cx = x + CELL_SIZE / 2;
            const cy = y + CELL_SIZE / 2 + 2;

            // Black Bomb Sphere
            g.fillStyle(0x1e293b, alpha);
            g.fillCircle(cx, cy, 7.5);
            g.fillStyle(0x020617, alpha);
            g.fillCircle(cx, cy, 6.5);

            // Gloss highlight on bomb
            g.fillStyle(0xffffff, alpha * 0.9);
            g.fillRect(cx - 4, cy - 4, 2, 2);
            g.fillRect(cx - 2, cy - 5, 2, 1);
            g.fillRect(cx - 5, cy - 2, 1, 2);

            // Metallic Cap Neck
            g.fillStyle(0x64748b, alpha);
            g.fillRect(cx - 2, cy - 9.5, 4, 2);

            // Curved Wick/Fuse
            g.fillStyle(0x78350f, alpha);
            g.fillRect(cx + 1, cy - 11.5, 2, 2);
            g.fillRect(cx + 3, cy - 12.5, 2, 2);

            // Burning Spark Flame (Red, Orange, Yellow)
            g.fillStyle(0xef4444, alpha);
            g.fillRect(cx + 4, cy - 14, 4, 4);
            g.fillStyle(0xf97316, alpha);
            g.fillRect(cx + 4.5, cy - 13.5, 3, 3);
            g.fillStyle(0xfde047, alpha);
            g.fillRect(cx + 5, cy - 13, 2, 2);

            // Fiery Spark Mark on Bomb Body
            g.fillStyle(0xf59e0b, alpha * 0.9);
            g.fillRect(cx - 1, cy - 1, 2, 2);
            g.fillRect(cx, cy - 2, 1, 4);
            g.fillRect(cx - 2, cy, 4, 1);
        } else {
            g.fillStyle(color, alpha);
            g.fillRoundedRect(x, y, CELL_SIZE, CELL_SIZE, 6);
            
            // Add a simple inner highlight for a bit of depth
            g.lineStyle(2, 0xffffff, alpha * 0.2);
            g.strokeRoundedRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2, 5);
        }
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
        this.crownIcon.setScale(0.05);
        if (intensity === 'big') {
            // Line clear / match: goyang gembira tetap konsisten di ukuran 0.05
            this.tweens.add({
                targets: this.crownIcon,
                angle: { from: -10, to: 10 },
                scaleX: 0.05, scaleY: 0.05,
                yoyo: true, repeat: 2, duration: 75,
                ease: 'Sine.easeInOut',
                onComplete: () => {
                    this.crownIcon.setAngle(0);
                    this.crownIcon.setScale(0.05);
                }
            });
        } else {
            // Place tanpa clear: goyang kecil tetap di ukuran 0.05
            this.tweens.add({
                targets: this.crownIcon,
                angle: { from: -4, to: 4 },
                scaleX: 0.05, scaleY: 0.05,
                yoyo: true, repeat: 1, duration: 60,
                ease: 'Sine.easeInOut',
                onComplete: () => {
                    this.crownIcon.setAngle(0);
                    this.crownIcon.setScale(0.05);
                }
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

            if (colorObj && colorObj.isSpecial === 'rainbow') {
                this._drawPixelCell(g, bx, by, colorObj.color, 1, 'rainbow');
            } else if (colorObj && colorObj.isSpecial === 'bomb') {
                const baseColor = colorObj.color || 0xef4444;
                this._drawPixelCell(g, bx, by, baseColor, 1, 'bomb');
            } else if (colorObj && colorObj.useSprite) {
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
        if (colorObj.isSpecial === 'rainbow') return COLOR_RAINBOW;
        if (colorObj.isSpecial === 'bomb') {
            const base = ACTIVE_COLORS.find(activeColor =>
                activeColor.id === colorObj.id || activeColor.color === colorObj.color
            ) || ACTIVE_COLORS[0];
            return { ...base, isSpecial: 'bomb' };
        }
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
            this.activeDragPiece.x = pointer.worldX;
            this.activeDragPiece.y = pointer.worldY + FINGER_OFFSET_Y;
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
        triggerHaptic(14);

        container.setDepth(60);
        this.tweens.killTweensOf(container);

        // Smooth scale-up to full size (1.0) with responsive lift pop
        this.tweens.add({
            targets: container,
            scaleX: 1.0,
            scaleY: 1.0,
            duration: 120,
            ease: 'Back.easeOut'
        });

        container.x = pointer.worldX;
        container.y = pointer.worldY + FINGER_OFFSET_Y;
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
            
            if (colorObj && colorObj.isSpecial === 'rainbow') {
                this.ghostGraphics.fillStyle(0xffffff, 0.55);
                this.ghostGraphics.fillRoundedRect(x, y, CELL_SIZE, CELL_SIZE, 6);
                this.ghostGraphics.lineStyle(2, 0xfacc15, 0.95);
                this.ghostGraphics.strokeRoundedRect(x, y, CELL_SIZE, CELL_SIZE, 6);
            } else if (colorObj && colorObj.isSpecial === 'bomb') {
                this.ghostGraphics.fillStyle(0xef4444, 0.5);
                this.ghostGraphics.fillRoundedRect(x, y, CELL_SIZE, CELL_SIZE, 6);
                this.ghostGraphics.lineStyle(2, 0x1e293b, 0.95);
                this.ghostGraphics.strokeRoundedRect(x, y, CELL_SIZE, CELL_SIZE, 6);
            } else {
                const fallbackColor = colorObj ? colorObj.color : 0xcbd5e1;
                this.ghostGraphics.fillStyle(fallbackColor, 0.45);
                this.ghostGraphics.fillRoundedRect(x, y, CELL_SIZE, CELL_SIZE, 6);
                this.ghostGraphics.lineStyle(1.5, 0xffffff, 0.6);
                this.ghostGraphics.strokeRoundedRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2, 5);
            }
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

        // Catat koordinat sel yang sudah terisi SEBELUM menaruh balok ini
        const preExistingOccupied = new Set();
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (this.board[r][c] !== null) {
                    preExistingOccupied.add(`${r},${c}`);
                }
            }
        }

        const placedBombs = [];

        shapeData.cells.forEach(([c, r, colorObj]) => {
            const row = targetRow + r;
            const col = targetCol + c;
            const fallbackColor = colorObj ? colorObj.color : 0xcbd5e1;
            this.board[row][col] = fallbackColor;
            
            if (colorObj && colorObj.isSpecial === 'rainbow') {
                this.boardSpecial[row][col] = 'rainbow';
                this.boardSprite[row][col] = null;
            } else if (colorObj && colorObj.isSpecial === 'bomb') {
                this.boardSpecial[row][col] = 'bomb';
                this.boardSprite[row][col] = null;
                placedBombs.push({ col, row });
            } else {
                this.boardSpecial[row][col] = null;
                if (colorObj && colorObj.useSprite) {
                    this.boardSprite[row][col] = colorObj.useSprite;
                } else {
                    this.boardSprite[row][col] = null;
                }
            }
        });

        this._renderBoardFills();
        
        // Placement score with Fever multiplier
        const basePlaceScore = shapeData.cells.length;
        const placeScore = this.isFeverActive ? basePlaceScore * 2 : basePlaceScore;
        this._addScore(placeScore);

        // Tactile micro-shake on placing piece
        this.cameras.main.shake(35, 0.0008);

        this._spawnPlaceParticles(targetCol, targetRow, shapeData);

        container.destroy();
        this.slotContainers[slotIndex] = null;
        this.slotPieces[slotIndex] = null;

        // Cek apakah bom harus meledak langsung (jika ada blok lain di sekitarnya)
        // atau tetap bertahan sebagai bom siaga aktif (jika ditaruh di area kosong)
        const immediateBombsToDetonate = [];
        placedBombs.forEach(({ col, row }) => {
            let neighborPreExistingCount = 0;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = row + dr;
                    const nc = col + dc;
                    if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
                        if (preExistingOccupied.has(`${nr},${nc}`)) {
                            neighborPreExistingCount++;
                        }
                    }
                }
            }

            if (neighborPreExistingCount > 0) {
                immediateBombsToDetonate.push({ col, row });
            } else {
                // Bom ditaruh di area kosong: jangan hancurkan diri sendiri, jadikan bom siaga
                const bx = GRID_START_X + col * GRID_STEP + CELL_SIZE / 2;
                const by = GRID_START_Y + row * GRID_STEP - 6;
                this._floatText('💣 BOM SIAP!', bx, by);
            }
        });

        let bombed = false;
        if (immediateBombsToDetonate.length > 0) {
            bombed = this._detonateBombs(immediateBombsToDetonate);
        }

        const isMatch = this._resolveMatches();

        this._shakeCrown(isMatch || bombed ? 'big' : 'small');

        // Step fever moves counter if fever active
        if (this.isFeverActive) {
            this.feverTurnsLeft--;
            this.feverGauge = Math.max(0, (this.feverTurnsLeft / 6) * 100);
            this._drawFeverBar();
            if (this.feverTurnsLeft <= 0) {
                this._deactivateFeverMode();
            }
        }

        if (this.slotPieces.every(piece => piece === null)) this.spawnSlotPieces();

        this._checkGameOver();
    }

    _detonateBombs(bombList) {
        if (!bombList || bombList.length === 0) return false;

        const cellsToBlast = new Set();
        const chainedBombs = [];

        bombList.forEach(({ col, row }) => {
            cellsToBlast.add(`${row},${col}`);
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = row + dr;
                    const nc = col + dc;
                    if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
                        if (this.board[nr][nc] !== null) {
                            cellsToBlast.add(`${nr},${nc}`);
                            // Deteksi jika ada bom sekunder di radius ledakan
                            if (this.boardSpecial[nr][nc] === 'bomb' && !(nr === row && nc === col)) {
                                if (!bombList.some(b => b.col === nc && b.row === nr) &&
                                    !chainedBombs.some(b => b.col === nc && b.row === nr)) {
                                    chainedBombs.push({ col: nc, row: nr });
                                }
                            }
                        }
                    }
                }
            }
        });

        this.audio.playBombExplosion();
        triggerHaptic([50, 50, 80]);
        this.cameras.main.shake(250, 0.012);

        const baseBombScore = Math.max(1, cellsToBlast.size) * 15;
        const bombScore = this.isFeverActive ? baseBombScore * 2 : baseBombScore;
        this._addScore(bombScore);
        this._updateFever(20);

        this._floatText('BOOM! 3x3 BLAST!', 180, 260);
        this._floatText(`+${bombScore}`, 180, 285);

        const flash = this.add.graphics().setDepth(20);
        const clearedCells = [];

        cellsToBlast.forEach(key => {
            const [r, c] = key.split(',').map(Number);
            const x = GRID_START_X + c * GRID_STEP;
            const y = GRID_START_Y + r * GRID_STEP;
            const colorNum = this.board[r][c] || 0xcbd5e1;

            flash.fillStyle(0xffffff, 0.85);
            flash.fillRoundedRect(x, y, CELL_SIZE, CELL_SIZE, 6);

            clearedCells.push([x, y, colorNum]);
            this.board[r][c] = null;
            this.boardSprite[r][c] = null;
            this.boardSpecial[r][c] = null;
        });

        this._renderBoardFills();
        clearedCells.forEach(([x, y, colorNum]) => this._spawnBombBlastParticle(x, y, colorNum));

        // Rantai ledakan berantai untuk bom sekunder
        if (chainedBombs.length > 0) {
            this.time.delayedCall(120, () => {
                this._detonateBombs(chainedBombs);
            });
        }

        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 200,
            ease: 'Linear',
            onComplete: () => flash.destroy()
        });

        return true;
    }

    _spawnBombBlastParticle(x, y, color) {
        const blastColors = [0xef4444, 0xf97316, 0xfacc15, 0x1e293b];
        for (let i = 0; i < 5; i++) {
            const p = this.add.graphics().setDepth(55);
            const sz = Phaser.Math.Between(3, 7);
            p.fillStyle(Phaser.Utils.Array.GetRandom(blastColors), 1);
            p.fillRect(-sz / 2, -sz / 2, sz, sz);
            p.setPosition(x + CELL_SIZE / 2, y + CELL_SIZE / 2);

            const angle = Math.random() * Math.PI * 2;
            const dist = Phaser.Math.Between(20, 50);

            this.tweens.add({
                targets: p,
                x: p.x + Math.cos(angle) * dist,
                y: p.y + Math.sin(angle) * dist,
                alpha: 0,
                scaleX: 0.2,
                scaleY: 0.2,
                duration: Phaser.Math.Between(300, 550),
                ease: 'Cubic.easeOut',
                onComplete: () => p.destroy()
            });
        }
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

    // ── Line / Color Clear ──────────────────────────────────

    _findMatchCells() {
        const matchedCells = new Set();
        let hasRainbowInMatch = false;

        for (const activeColor of ACTIVE_COLORS) {
            const targetVal = activeColor.color;
            const visitedForColor = new Set();

            for (let r = 0; r < GRID_SIZE; r++) {
                for (let c = 0; c < GRID_SIZE; c++) {
                    const key = `${r},${c}`;
                    if (visitedForColor.has(key)) continue;

                    const cellColor = this.board[r][c];
                    const special = this.boardSpecial[r][c];

                    // Candidate if cell is targetColor OR is Rainbow wildcard
                    const isCandidate = cellColor !== null && (cellColor === targetVal || special === 'rainbow');
                    if (!isCandidate) continue;

                    const group = [];
                    let nonRainbowCount = 0;
                    let rainbowCount = 0;
                    const queue = [[r, c]];
                    visitedForColor.add(key);

                    while (queue.length > 0) {
                        const [currR, currC] = queue.shift();
                        group.push(`${currR},${currC}`);
                        if (this.boardSpecial[currR][currC] === 'rainbow') {
                            rainbowCount++;
                        } else {
                            nonRainbowCount++;
                        }

                        const dirs = [[0,1], [1,0], [0,-1], [-1,0]];
                        for (const [dr, dc] of dirs) {
                            const nr = currR + dr;
                            const nc = currC + dc;
                            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
                                const nKey = `${nr},${nc}`;
                                if (!visitedForColor.has(nKey)) {
                                    const nColor = this.board[nr][nc];
                                    const nSpecial = this.boardSpecial[nr][nc];
                                    if (nColor !== null && (nColor === targetVal || nSpecial === 'rainbow')) {
                                        visitedForColor.add(nKey);
                                        queue.push([nr, nc]);
                                    }
                                }
                            }
                        }
                    }

                    if (group.length >= 3 && (nonRainbowCount > 0 || rainbowCount >= 3)) {
                        group.forEach(k => {
                            matchedCells.add(k);
                            const [gr, gc] = k.split(',').map(Number);
                            if (this.boardSpecial[gr][gc] === 'rainbow') {
                                hasRainbowInMatch = true;
                            }
                        });
                    }
                }
            }
        }

        return { matchedCells, hasRainbow: hasRainbowInMatch };
    }

    _resolveMatches() {
        let matched = false;
        let guard = GRID_SIZE * GRID_SIZE;

        while (guard-- > 0) {
            const { matchedCells, hasRainbow } = this._findMatchCells();
            if (matchedCells.size === 0) {
                if (!matched) this.comboStreak = 0;
                break;
            }
            this._clearMatchedCells(matchedCells, hasRainbow);
            matched = true;
        }

        return matched;
    }

    _clearMatchedCells(toClear, hasRainbow = false) {
        if (toClear.size === 0) {
            this.comboStreak = 0;
            return false;
        }

        this.comboStreak++;
        if (hasRainbow) {
            this.audio.playRainbowMatch();
        }
        this.audio.playLineClear(this.comboStreak);
        if (this.comboStreak > 1) {
            this.audio.playCombo(this.comboStreak);
        }
        triggerHaptic(toClear.size >= 5 ? [30, 40, 60] : 30);

        const comboBonus = (this.comboStreak > 1) ? this.comboStreak * 5 : 0;
        const baseLineScore = (toClear.size * 10) + comboBonus;
        const lineScore = this.isFeverActive ? baseLineScore * 2 : baseLineScore;
        this._addScore(lineScore);

        // Charge Fever Gauge on match / combo (scales with match cluster size and combo streak)
        const feverGain = Math.min(45, 12 + toClear.size * 3 + (this.comboStreak > 1 ? (this.comboStreak - 1) * 8 : 0));
        this._updateFever(feverGain);

        // Dynamic and juicy camera shake
        if (this.comboStreak > 1) {
            this.cameras.main.shake(160, 0.006 + Math.min(0.010, this.comboStreak * 0.002));
        } else if (toClear.size >= 5) {
            this.cameras.main.shake(140, 0.0055);
        } else {
            this.cameras.main.shake(90, 0.0025);
        }

        if (toClear.size >= 5) {
            this._floatText(`WOW! ${toClear.size} MATCH!`, 180, 260);
        }
        if (this.comboStreak > 1) {
            this._floatText(`STREAK x${this.comboStreak}!`, 180, 285);
        }
        this._floatText(`+${lineScore}${this.isFeverActive ? ' [2X]' : ''}`, 180, toClear.size >= 5 ? 310 : 265);

        const flash = this.add.graphics().setDepth(15);
        const clearedCells = [];
        const bombsTriggered = [];

        // 1. Kumpulkan semua bom yang ikut terhapus atau berdampingan SEBELUM sel dikosongkan
        toClear.forEach(key => {
            const [r, c] = key.split(',').map(Number);
            const dirs = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]];
            for (const [dr, dc] of dirs) {
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
                    if (this.boardSpecial[nr][nc] === 'bomb') {
                        if (!bombsTriggered.some(b => b.col === nc && b.row === nr)) {
                            bombsTriggered.push({ col: nc, row: nr });
                        }
                    }
                }
            }
        });

        // 2. Kosongkan sel yang di-match dan render efek kilau putih
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
            this.boardSpecial[r][c] = null;
        });

        this._renderBoardFills();
        clearedCells.forEach(([x, y, colorNum]) => this._spawnClearParticle(x, y, colorNum));

        // Jika ada balok bom yang ikut terhapus atau tersenggol oleh match ini, ledakkan 3x3 berantai
        if (bombsTriggered.length > 0) {
            this.time.delayedCall(140, () => {
                this._detonateBombs(bombsTriggered);
            });
        }

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
     * Incorporates special power-up blocks (Rainbow Wildcard & Bomb).
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
            // 75% distinct (A, B) for vibrant visual variety, 25% pair (A, A)
            if (Math.random() < 0.75) {
                assignedColors.push(primaryColor, secondaryColor);
            } else {
                assignedColors.push(primaryColor, primaryColor);
            }
        } else if (numCells === 3) {
            // NEVER (A, A, A)! Max 2 of same color.
            // 65% (A, B, C) for colorful richness
            // 35% (A, A, B)
            if (Math.random() < 0.65) {
                assignedColors.push(primaryColor, secondaryColor, tertiaryColor);
            } else {
                assignedColors.push(primaryColor, primaryColor, secondaryColor);
            }
        } else if (numCells === 4) {
            // NEVER 3+ of same color! Max 2 of any color.
            // 50% (A, B, C, D) 4 distinct colors
            // 40% (A, A, B, C) 1 pair + 2 distinct
            // 10% (A, A, B, B) 2 pairs
            const roll = Math.random();
            if (roll < 0.50) {
                assignedColors.push(primaryColor, secondaryColor, tertiaryColor, quaternaryColor);
            } else if (roll < 0.90) {
                assignedColors.push(primaryColor, primaryColor, secondaryColor, tertiaryColor);
            } else {
                assignedColors.push(primaryColor, primaryColor, secondaryColor, secondaryColor);
            }
        } else {
            // 5 cells: 60% 5 distinct colors (A, B, C, D, E), 40% (A, A, B, C, D)
            const fifthOptions = ACTIVE_COLORS.filter(c => c.id !== primaryColor.id && c.id !== secondaryColor.id && c.id !== tertiaryColor.id && c.id !== quaternaryColor.id);
            const fifthColor = fifthOptions.length > 0 ? fifthOptions[0] : secondaryColor;
            if (Math.random() < 0.60) {
                assignedColors.push(primaryColor, secondaryColor, tertiaryColor, quaternaryColor, fifthColor);
            } else {
                assignedColors.push(primaryColor, primaryColor, secondaryColor, tertiaryColor, quaternaryColor);
            }
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

        // Special Block Roll (Rainbow Wildcard / Bomb)
        const specialSpawnChance = this.isFeverActive ? 0.32 : 0.12;
        if (Math.random() < specialSpawnChance) {
            const specialIndex = Phaser.Math.Between(0, assignedColors.length - 1);
            if (Math.random() < 0.55) {
                assignedColors[specialIndex] = COLOR_RAINBOW;
            } else {
                const base = assignedColors[specialIndex];
                assignedColors[specialIndex] = { ...base, isSpecial: 'bomb' };
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
            this.spawnSlotPieces();
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

            // Efek: mahkota berkedip saat rekor terlampaui (tetap di ukuran 0.05)
            this.tweens.add({
                targets: this.crownIcon,
                angle: { from: -15, to: 15 },
                scaleX: 0.05, scaleY: 0.05,
                yoyo: true, duration: 120, repeat: 2,
                ease: 'Sine.easeInOut',
                onComplete: () => {
                    this.crownIcon.setAngle(0);
                    this.crownIcon.setScale(0.05);
                }
            });
        }
        this._syncScoreUI();

        // Check Stage Milestones
        const MILESTONES = [
            { score: 500, title: 'STAGE 1 CLEARED!', subtitle: 'PEMULA HEBAT!', icon: 'star', color: 0xf59e0b, textColor: '#d97706' },
            { score: 1000, title: 'STAGE 2 CLEARED!', subtitle: 'AHLI STRATEGI BPS!', icon: 'trophy', color: 0xeab308, textColor: '#b45309' },
            { score: 2500, title: 'STAGE 3 CLEARED!', subtitle: 'MASTER PUZZLE!', icon: 'rocket', color: 0x3b82f6, textColor: '#1d4ed8' },
            { score: 5000, title: 'STAGE 4 CLEARED!', subtitle: 'RAJA BALOK BPS!', icon: 'crown', color: 0xa855f7, textColor: '#7e22ce' },
            { score: 10000, title: 'STAGE 5 CLEARED!', subtitle: 'LEGENDA 1010!', icon: 'diamond', color: 0x06b6d4, textColor: '#0e7490' }
        ];

        for (const ms of MILESTONES) {
            if (this.score >= ms.score && !this.unlockedMilestones.has(ms.score)) {
                this.unlockedMilestones.add(ms.score);
                this._showMilestoneBanner(ms);
                break;
            }
        }

        // Efek: score pop animation
        this.tweens.killTweensOf(this.scoreValueText);
        this.scoreValueText.setScale(1.3);
        this.tweens.add({
            targets: this.scoreValueText,
            scaleX: 1, scaleY: 1,
            duration: 200, ease: 'Back.easeOut'
        });
    }

    // ── Stage / Milestone Celebrations ───────────────────────

    _buildMilestoneBanner() {
        this.milestoneContainer = this.add.container(180, 200).setDepth(90).setVisible(false);

        // Background Card
        this.milestoneBg = this.add.graphics();
        this.milestoneContainer.add(this.milestoneBg);

        // Pixel Icon Graphic
        this.milestoneIcon = this.add.graphics();
        this.milestoneContainer.add(this.milestoneIcon);

        // Title Text
        this.milestoneTitle = this.add.text(0, 10, 'STAGE 1 CLEARED!', {
            fontFamily: FONT_PIXEL, fontSize: '8px', color: '#1e293b'
        }).setOrigin(0.5).setResolution(4);
        this.milestoneContainer.add(this.milestoneTitle);

        // Subtitle Text (Proud Motivation)
        this.milestoneSubtitle = this.add.text(0, 26, 'PEMULA HEBAT!', {
            fontFamily: FONT_PIXEL, fontSize: '7px', color: '#d97706'
        }).setOrigin(0.5).setResolution(4);
        this.milestoneContainer.add(this.milestoneSubtitle);

        // Tap to dismiss
        const hit = this.add.zone(0, 0, 250, 110).setInteractive({ useHandCursor: true });
        this.milestoneContainer.add(hit);
        hit.on('pointerdown', () => this._hideMilestoneBanner());
    }

    _drawPixelVectorIcon(g, type, cx, cy, sz = 2.5) {
        g.clear();
        const p = (col, row, color) => {
            g.fillStyle(color, 1);
            g.fillRect(cx + (col - 4) * sz, cy + (row - 4) * sz, sz, sz);
        };

        if (type === 'star') {
            const Y = 0xfacc15, O = 0xf59e0b, W = 0xfef08a, S = 0xd97706;
            p(3,0,Y); p(4,0,Y);
            p(3,1,W); p(4,1,Y);
            p(0,2,Y); p(1,2,Y); p(2,2,Y); p(3,2,W); p(4,2,Y); p(5,2,Y); p(6,2,Y); p(7,2,Y);
            p(1,3,Y); p(2,3,W); p(3,3,W); p(4,3,Y); p(5,3,Y); p(6,3,O);
            p(2,4,Y); p(3,4,Y); p(4,4,Y); p(5,4,O);
            p(1,5,Y); p(2,5,W); p(3,5,Y); p(4,5,Y); p(5,5,O); p(6,5,S);
            p(1,6,Y); p(2,6,Y); p(5,6,O); p(6,6,S);
            p(0,7,Y); p(7,7,S);
        } else if (type === 'trophy') {
            const Y = 0xfacc15, W = 0xfffbeb, O = 0xd97706, B = 0x92400e;
            p(1,0,Y); p(2,0,W); p(3,0,W); p(4,0,Y); p(5,0,Y); p(6,0,O);
            p(0,1,Y); p(1,1,W); p(2,1,W); p(3,1,Y); p(4,1,Y); p(5,1,O); p(6,1,O); p(7,1,B);
            p(0,2,Y); p(2,2,W); p(3,2,Y); p(4,2,Y); p(5,2,O); p(7,2,B);
            p(0,3,Y); p(2,3,W); p(3,3,Y); p(4,3,Y); p(5,3,O); p(7,3,B);
            p(1,4,Y); p(2,4,Y); p(3,4,Y); p(4,4,Y); p(5,4,O); p(6,4,B);
            p(3,5,Y); p(4,5,O);
            p(3,6,Y); p(4,6,O);
            p(1,7,B); p(2,7,O); p(3,7,Y); p(4,7,Y); p(5,7,O); p(6,7,B);
        } else if (type === 'rocket') {
            const R = 0xef4444, W = 0xf8fafc, C = 0x06b6d4, O = 0xf97316, Y = 0xfde047;
            p(3,0,R); p(4,0,R);
            p(2,1,R); p(3,1,W); p(4,1,W); p(5,1,R);
            p(2,2,W); p(3,2,C); p(4,2,C); p(5,2,W);
            p(2,3,W); p(3,3,C); p(4,3,C); p(5,3,W);
            p(2,4,W); p(3,4,W); p(4,4,W); p(5,4,W);
            p(1,5,R); p(2,5,W); p(3,5,W); p(4,5,W); p(5,5,W); p(6,5,R);
            p(0,6,R); p(1,6,R); p(3,6,O); p(4,6,O); p(6,6,R); p(7,6,R);
            p(3,7,Y); p(4,7,Y);
        } else if (type === 'crown') {
            const Y = 0xfacc15, W = 0xfffbeb, R = 0xef4444, E = 0x10b981, O = 0xb45309;
            p(0,1,R); p(3,1,E); p(7,1,R);
            p(0,2,Y); p(3,2,Y); p(4,2,Y); p(7,2,Y);
            p(0,3,Y); p(1,3,W); p(3,3,W); p(4,3,Y); p(6,3,Y); p(7,3,O);
            p(0,4,Y); p(1,4,W); p(2,4,Y); p(3,4,Y); p(4,4,Y); p(5,4,Y); p(6,4,O); p(7,4,O);
            p(1,5,Y); p(2,5,R); p(3,5,Y); p(4,5,E); p(5,5,Y); p(6,5,R);
            p(1,6,O); p(2,6,Y); p(3,6,Y); p(4,6,Y); p(5,6,Y); p(6,6,O);
            p(1,7,O); p(2,7,O); p(3,7,O); p(4,7,O); p(5,7,O); p(6,7,O);
        } else {
            const C = 0x06b6d4, W = 0xffffff, B = 0x0284c7, D = 0x0369a1;
            p(2,1,C); p(3,1,W); p(4,1,W); p(5,1,C);
            p(1,2,C); p(2,2,W); p(3,2,C); p(4,2,B); p(5,2,B); p(6,2,D);
            p(0,3,C); p(1,3,W); p(2,3,C); p(3,3,C); p(4,3,B); p(5,3,B); p(6,3,D); p(7,3,D);
            p(1,4,C); p(2,4,C); p(3,4,B); p(4,4,B); p(5,4,D); p(6,4,D);
            p(2,5,C); p(3,5,B); p(4,5,B); p(5,5,D);
            p(3,6,B); p(4,6,D);
            p(3,7,D); p(4,7,D);
        }
    }

    _showMilestoneBanner(ms) {
        this.audio.playMilestone();
        this._spawnConfetti();

        const cardW = 240, cardH = 96;
        const cardX = -cardW / 2, cardY = -cardH / 2;

        this.milestoneBg.clear();
        // Glow/shadow
        this.milestoneBg.fillStyle(ms.color, 0.25);
        this.milestoneBg.fillRoundedRect(cardX - 3, cardY - 3, cardW + 6, cardH + 6, 14);
        // Body
        this.milestoneBg.fillStyle(0xffffff, 0.98);
        this.milestoneBg.fillRoundedRect(cardX, cardY, cardW, cardH, 12);
        // Border
        this.milestoneBg.lineStyle(2, ms.color, 1);
        this.milestoneBg.strokeRoundedRect(cardX, cardY, cardW, cardH, 12);

        // Draw pixel vector badge
        this._drawPixelVectorIcon(this.milestoneIcon, ms.icon, 0, -20, 2.8);

        // Set Texts
        this.milestoneTitle.setText(ms.title);
        this.milestoneSubtitle.setText(ms.subtitle).setColor(ms.textColor || '#d97706');

        // Animation
        this.milestoneContainer.setVisible(true).setAlpha(0).setScale(0.5).setPosition(180, 220);
        this.tweens.killTweensOf(this.milestoneContainer);

        this.tweens.add({
            targets: this.milestoneContainer,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            y: 200,
            duration: 300,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.time.delayedCall(2400, () => {
                    this._hideMilestoneBanner();
                });
            }
        });
    }

    _hideMilestoneBanner() {
        if (!this.milestoneContainer || !this.milestoneContainer.visible || this.milestoneContainer.alpha === 0) return;
        this.tweens.add({
            targets: this.milestoneContainer,
            alpha: 0,
            y: 180,
            scaleX: 0.9,
            scaleY: 0.9,
            duration: 250,
            ease: 'Cubic.easeIn',
            onComplete: () => {
                this.milestoneContainer.setVisible(false);
            }
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
        this.unlockedMilestones = new Set();
        if (this.milestoneContainer) {
            this.milestoneContainer.setVisible(false).setAlpha(0);
        }
        this.gameOverTimer?.remove(false);
        this.gameOverTimer = null;
        this.gameOverContainer.setVisible(false);
        this.pauseContainer.setVisible(false);
        this.score = 0;
        this._syncScoreUI();

        // Reset Fever state
        this.feverGauge = 0;
        this.isFeverActive = false;
        this.feverTurnsLeft = 0;
        if (this.feverAuraBorder) {
            this.tweens.killTweensOf(this.feverAuraBorder);
            this.feverAuraBorder.setVisible(false);
        }
        this._drawFeverBar();

        for (let r = 0; r < GRID_SIZE; r++) {
            this.board[r].fill(null);
            this.boardSprite[r].fill(null);
            this.boardSpecial[r].fill(null);
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
