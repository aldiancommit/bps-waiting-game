/**
 * Core Gameplay Scene for Memory Angka (BPS Waiting Game).
 * Features:
 * - High-DPI 360x640 logical canvas with zero runtime allocation
 * - 30 Pre-allocated pooled tiles (Zero GC on mobile)
 * - ASC / DESC order rules with clear HUD indicators
 * - Countdown memorization bar with early "SIAP" time bonus
 * - Soft DDA adaptive difficulty & deterministic procedural levels
 * - 100% offline WebAudio & Haptic synthesis
 */

import Phaser from 'phaser';
import {
    FONT_PIXEL,
    FONT_UI,
    BOARD_AREA,
    MAX_LIVES,
    MAX_COMBO,
    BASE_SCORE_PER_TAP,
    PEEK_DURATION_MS,
    WRONG_BLINK_MS,
    C
} from '../data/Constants.js';
import { getLevelConfig, TOTAL_CAMPAIGN_LEVELS } from '../data/Levels.js';
import { generateLevelLayout } from '../utils/LevelGenerator.js';
import { getAdjustedShowMs, recordLevelAttempt } from '../utils/Difficulty.js';
import { RetroAudio, triggerHaptic } from '../../../shared/Audio.js';
import {
    saveMemoryUnlockedLevel,
    saveMemoryLevelStars,
    saveMemoryLevelScore,
    getMemoryLevelScores,
    saveMemoryTotalScore
} from '../../../shared/Storage.js';
import { sessionStore } from '../../../SessionState.js';

export class MemoryScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MemoryScene' });
        this.audio = new RetroAudio();
    }

    init(data) {
        this.level = data.level || 1;
        this.attemptSalt = 0;
        this.previousSignature = 0;
    }

    preload() {
        this.load.image('logo-bps', 'assets/logo-bps.webp');
        this.load.image('mahkota', 'assets/mahkota-icon.webp');
        this.load.image('restart-icon', 'assets/restart-icon.webp');
    }

    create() {
        // High-DPI Camera Setup
        this.cameras.main.resetFX();
        const dpr = this.game.config.width / 360;
        this.cameras.main.setZoom(dpr);
        this.cameras.main.centerOn(180, 320);

        // Pre-allocate tile pool (max 5x6 = 30 tiles)
        this.tilePool = [];
        this.confettiPool = [];

        this._buildBackground();
        this._buildHeader();
        this._buildHUD();
        this._buildCountdownBar();
        this._buildBottomControls();
        this._initTilePool();
        this._buildResultModal();
        this._buildGameOverModal();
        this._buildPauseModal();
        this._setupAutoPause();

        // Start or Restore Level
        const saved = sessionStore.getGame('memory');
        if (saved && saved.level === this.level && Array.isArray(saved.cards)) {
            this._restoreLevel(saved);
        } else {
            this._startLevel(this.level);
        }

        // Fade in
        this.cameras.main.fadeIn(200, 241, 245, 249);
    }

    // ── Background & Layout ─────────────────────────────────

    _buildBackground() {
        const g = this.add.graphics();
        g.fillStyle(C.BG_BASE, 1);
        g.fillRect(0, 0, 360, 640);
    }

    _buildHeader() {
        const topY = 20;

        // 1. Logo BPS
        if (this.textures.exists('logo-bps')) {
            this.bpsLogo = this.add.image(18, topY, 'logo-bps')
                .setDisplaySize(34, 26)
                .setOrigin(0, 0.5)
                .setDepth(25);
        }

        // 2. BPS Title & Subtitle
        this.add.text(58, topY - 7, 'BPS', {
            fontFamily: FONT_UI,
            fontSize: '17px',
            fontStyle: '750',
            color: C.SCORE_VAL
        }).setOrigin(0, 0.5).setResolution(3).setDepth(25);

        this.add.text(58, topY + 7, 'Badan Pusat Statistik', {
            fontFamily: FONT_UI,
            fontSize: '10.5px',
            fontStyle: '300',
            color: C.SCORE_VAL
        }).setOrigin(0, 0.5).setResolution(3).setDepth(25);

        // 3. Audio Toggle Button
        this.audioBtn = this.add.container(288, topY).setDepth(25);
        const audioBg = this.add.graphics();
        audioBg.fillStyle(0xffffff, 1);
        audioBg.fillRoundedRect(-15, -15, 30, 30, 8);
        audioBg.lineStyle(1, C.CELL_BORDER, 0.8);
        audioBg.strokeRoundedRect(-15, -15, 30, 30, 8);
        this.audioBtn.add(audioBg);

        this.audioIconG = this.add.graphics();
        this.audioBtn.add(this.audioIconG);
        this._drawAudioIcon();

        const audioHit = this.add.zone(0, 0, 34, 34).setInteractive({ useHandCursor: true });
        this.audioBtn.add(audioHit);
        audioHit.on('pointerdown', () => {
            this.audio.toggleMute();
            this._drawAudioIcon();
            this._drawCardAudioIcon();
            triggerHaptic(15);
        });

        // 4. Pause Button
        this.pauseBtn = this.add.container(330, topY).setDepth(25);
        const pauseBg = this.add.graphics();
        pauseBg.fillStyle(0xffffff, 1);
        pauseBg.fillRoundedRect(-15, -15, 30, 30, 8);
        pauseBg.lineStyle(1, C.CELL_BORDER, 0.8);
        pauseBg.strokeRoundedRect(-15, -15, 30, 30, 8);
        this.pauseBtn.add(pauseBg);

        const pauseG = this.add.graphics();
        pauseG.fillStyle(0x1e293b, 1);
        pauseG.fillRect(-4, -5, 2.5, 10);
        pauseG.fillRect(1.5, -5, 2.5, 10);
        this.pauseBtn.add(pauseG);

        const pauseHit = this.add.zone(0, 0, 34, 34).setInteractive({ useHandCursor: true });
        this.pauseBtn.add(pauseHit);
        pauseHit.on('pointerdown', () => {
            if (this.gameState === 'MEMORIZE' || this.gameState === 'GUESS') {
                triggerHaptic(15);
                this._togglePause(true);
            }
        });
    }

    _drawAudioIcon() {
        if (!this.audioIconG) return;
        this.audioIconG.clear();
        const isMuted = this.audio.getIsMuted();
        const color = isMuted ? 0x94a3b8 : 0x1e293b;
        this.audioIconG.fillStyle(color, 1);

        this.audioIconG.fillRect(-6, -3, 3, 6);
        this.audioIconG.fillTriangle(-3, -3, -3, 3, 2, 6);
        this.audioIconG.fillTriangle(-3, -3, 2, 6, 2, -6);

        if (isMuted) {
            this.audioIconG.lineStyle(2, 0xef4444, 1);
            this.audioIconG.lineBetween(-7, 7, 7, -7);
        } else {
            this.audioIconG.lineStyle(1.5, 0x3b82f6, 1);
            this.audioIconG.beginPath();
            this.audioIconG.arc(1, 0, 4, -Math.PI / 3, Math.PI / 3, false);
            this.audioIconG.strokePath();
            this.audioIconG.beginPath();
            this.audioIconG.arc(1, 0, 7, -Math.PI / 3, Math.PI / 3, false);
            this.audioIconG.strokePath();
        }
    }

    // ── HUD Elements ────────────────────────────────────────

    _buildHUD() {
        const hudY = 56;

        // 1. Level Pill (Kiri)
        this.levelPill = this.add.container(65, hudY).setDepth(20);
        const lvlBg = this.add.graphics();
        lvlBg.fillStyle(0xffffff, 1);
        lvlBg.fillRoundedRect(-48, -14, 96, 28, 8);
        lvlBg.lineStyle(1, C.CELL_BORDER, 0.8);
        lvlBg.strokeRoundedRect(-48, -14, 96, 28, 8);
        this.levelPill.add(lvlBg);

        this.levelText = this.add.text(0, 0, 'LV 1', {
            fontFamily: FONT_PIXEL,
            fontSize: '10px',
            color: C.SCORE_VAL
        }).setOrigin(0.5).setResolution(2);
        this.levelPill.add(this.levelText);

        // 2. Order Rule Badge (Tengah)
        this.ruleBadge = this.add.container(180, hudY).setDepth(20);
        this.ruleBg = this.add.graphics();
        this.ruleBadge.add(this.ruleBg);

        this.ruleText = this.add.text(0, 0, 'URUT: NAIK ↗', {
            fontFamily: FONT_PIXEL,
            fontSize: '8.5px',
            color: '#ffffff'
        }).setOrigin(0.5).setResolution(2);
        this.ruleBadge.add(this.ruleText);

        // 3. Lives Container / Hearts (Kanan)
        this.livesContainer = this.add.container(295, hudY).setDepth(20);
        const livesBg = this.add.graphics();
        livesBg.fillStyle(0xffffff, 1);
        livesBg.fillRoundedRect(-48, -14, 96, 28, 8);
        livesBg.lineStyle(1, C.CELL_BORDER, 0.8);
        livesBg.strokeRoundedRect(-48, -14, 96, 28, 8);
        this.livesContainer.add(livesBg);

        this.heartsText = this.add.text(0, 0, '❤️❤️❤️', {
            fontSize: '12px'
        }).setOrigin(0.5);
        this.livesContainer.add(this.heartsText);

        // 4. Score & Combo Bar (Baris Kedua HUD: y=92)
        const scoreY = 92;
        this.scoreContainer = this.add.container(180, scoreY).setDepth(20);

        const scoreBg = this.add.graphics();
        scoreBg.fillStyle(0xffffff, 1);
        scoreBg.fillRoundedRect(-162, -14, 324, 28, 8);
        scoreBg.lineStyle(1, C.CELL_BORDER, 0.8);
        scoreBg.strokeRoundedRect(-162, -14, 324, 28, 8);
        this.scoreContainer.add(scoreBg);

        this.scoreLabel = this.add.text(-145, 0, 'SKOR', {
            fontFamily: FONT_PIXEL,
            fontSize: '8px',
            color: '#64748b'
        }).setOrigin(0, 0.5).setResolution(2);
        this.scoreContainer.add(this.scoreLabel);

        this.scoreValText = this.add.text(-95, 0, '0', {
            fontFamily: FONT_PIXEL,
            fontSize: '12.5px',
            color: C.SCORE_VAL
        }).setOrigin(0, 0.5).setResolution(2);
        this.scoreContainer.add(this.scoreValText);

        this.comboValText = this.add.text(145, 0, 'COMBO x1', {
            fontFamily: FONT_PIXEL,
            fontSize: '8.5px',
            color: '#b45309'
        }).setOrigin(1, 0.5).setResolution(2);
        this.scoreContainer.add(this.comboValText);
    }

    _updateRuleBadge(orderRule) {
        this.ruleBg.clear();
        if (orderRule === 'DESC') {
            this.ruleBg.fillStyle(0xea580c, 1); // Amber orange for countdown
            this.ruleBg.fillRoundedRect(-54, -14, 108, 28, 8);
            this.ruleText.setText('URUT: TURUN ↘');
        } else {
            this.ruleBg.fillStyle(0x3A5192, 1); // Navy blue for normal
            this.ruleBg.fillRoundedRect(-54, -14, 108, 28, 8);
            this.ruleText.setText('URUT: NAIK ↗');
        }
    }

    _updateLivesDisplay() {
        const hearts = '❤️'.repeat(Math.max(0, this.lives)) + '🖤'.repeat(Math.max(0, MAX_LIVES - this.lives));
        this.heartsText.setText(hearts);
    }

    // ── Countdown Bar ───────────────────────────────────────

    _buildCountdownBar() {
        this.countdownContainer = this.add.container(180, 130).setDepth(20);

        const trackW = 324, trackH = 8;
        const trackX = -trackW / 2, trackY = -trackH / 2;

        const trackBg = this.add.graphics();
        trackBg.fillStyle(0xe2e8f0, 1);
        trackBg.fillRoundedRect(trackX, trackY, trackW, trackH, 4);
        trackBg.lineStyle(1, 0xcbd5e1, 1);
        trackBg.strokeRoundedRect(trackX, trackY, trackW, trackH, 4);
        this.countdownContainer.add(trackBg);

        this.countdownBarG = this.add.graphics();
        this.countdownContainer.add(this.countdownBarG);

        this.phaseLabel = this.add.text(0, -14, 'HAFALKAN POSISI ANGKA', {
            fontFamily: FONT_PIXEL,
            fontSize: '8px',
            color: '#64748b'
        }).setOrigin(0.5).setResolution(2);
        this.countdownContainer.add(this.phaseLabel);
    }

    _drawCountdownProgress(pct) {
        const trackW = 324, trackH = 8;
        const trackX = -trackW / 2, trackY = -trackH / 2;
        const fillW = Math.max(0, (trackW - 2) * pct);
        const color = pct > 0.3 ? 0x3b82f6 : 0xef4444;

        if (
            pct > 0 &&
            pct < 1 &&
            this._lastBarW !== undefined &&
            Math.abs(fillW - this._lastBarW) < 0.5 &&
            color === this._lastBarColor
        ) {
            return;
        }

        this._lastBarW = fillW;
        this._lastBarColor = color;

        this.countdownBarG.clear();
        if (fillW > 0) {
            this.countdownBarG.fillStyle(color, 1);
            this.countdownBarG.fillRoundedRect(trackX + 1, trackY + 1, fillW, trackH - 2, 3);
        }
    }

    // ── Bottom Action Controls (SIAP / INTIP) ────────────────

    _buildBottomControls() {
        const botY = 570;

        // 1. Tombol SIAP (Fase HAFAL)
        this.readyBtn = this.add.container(180, botY).setDepth(20);
        const readyBg = this.add.graphics();
        readyBg.fillStyle(C.BTN_GREEN, 1);
        readyBg.fillRoundedRect(-90, -22, 180, 44, 10);
        readyBg.fillStyle(0xffffff, 0.2);
        readyBg.fillRoundedRect(-90, -22, 180, 22, { tl: 10, tr: 10, bl: 0, br: 0 });
        this.readyBtn.add(readyBg);

        const readyTxt = this.add.text(0, 0, 'SAYA SIAP!', {
            fontFamily: FONT_PIXEL,
            fontSize: '10px',
            color: '#ffffff'
        }).setOrigin(0.5).setResolution(2);
        this.readyBtn.add(readyTxt);

        const readyHit = this.add.zone(0, 0, 180, 44).setInteractive({ useHandCursor: true });
        this.readyBtn.add(readyHit);
        readyHit.on('pointerdown', () => {
            if (this.gameState === 'MEMORIZE') {
                triggerHaptic(20);
                this.audio.playPickup();
                // Award early time bonus
                const remainingRatio = Math.max(0, (this.memorizeTimerTotal - this.memorizeTimerElapsed) / this.memorizeTimerTotal);
                const timeBonus = Math.round(remainingRatio * 300);
                this.score += timeBonus;
                this.scoreValText.setText(`${this.score}`);
                if (timeBonus > 50) {
                    this._floatText(`+${timeBonus} BONUS CEPAT!`, 180, 520, '#d97706');
                }
                this._finishMemorizePhase();
            }
        });

        // 2. Tombol INTIP / Hint (Fase TEBAK)
        this.peekBtn = this.add.container(180, botY).setDepth(20).setVisible(false);
        this.peekBg = this.add.graphics();
        this.peekBtn.add(this.peekBg);

        this.peekText = this.add.text(0, 0, 'INTIP (1x)', {
            fontFamily: FONT_PIXEL,
            fontSize: '10px',
            color: '#ffffff'
        }).setOrigin(0.5).setResolution(2);
        this.peekBtn.add(this.peekText);

        const peekHit = this.add.zone(0, 0, 180, 44).setInteractive({ useHandCursor: true });
        this.peekBtn.add(peekHit);
        peekHit.on('pointerdown', () => {
            if (this.gameState === 'GUESS' && !this.usedPeek && !this.isPeeking) {
                this._usePeekHint();
            }
        });
    }

    _updatePeekButtonState() {
        this.peekBg.clear();
        if (this.usedPeek) {
            this.peekBg.fillStyle(C.BTN_DISABLED, 1);
            this.peekBg.fillRoundedRect(-90, -22, 180, 44, 10);
            this.peekText.setText('🔒 SUDAH DIGUNAKAN').setColor('#ffffff');
        } else {
            this.peekBg.fillStyle(C.BTN_AMBER, 1);
            this.peekBg.fillRoundedRect(-90, -22, 180, 44, 10);
            this.peekBg.fillStyle(0xffffff, 0.2);
            this.peekBg.fillRoundedRect(-90, -22, 180, 22, { tl: 10, tr: 10, bl: 0, br: 0 });
            this.peekText.setText('INTIP (1x)').setColor('#ffffff');
        }
    }

    // ── Zero GC Tile Pool ───────────────────────────────────

    _initTilePool() {
        this.tileContainer = this.add.container(0, 0).setDepth(10);
        // Pre-allocate 30 tile containers
        for (let i = 0; i < 30; i++) {
            const c = this.add.container(0, 0).setVisible(false);

            // 1. Tile Shadow
            const shadow = this.add.graphics();
            c.add(shadow);
            c.shadow = shadow;

            // 2. Tile Body Graphics
            const body = this.add.graphics();
            c.add(body);
            c.bodyG = body;

            // 3. Tile Value Text
            const txt = this.add.text(0, 0, '', {
                fontFamily: FONT_PIXEL,
                fontSize: '20px',
                color: '#ffffff'
            }).setOrigin(0.5).setResolution(2);
            c.add(txt);
            c.txt = txt;

            // 4. Interactive Hit Zone
            const zone = this.add.zone(0, 0, 50, 50).setInteractive({ useHandCursor: true });
            c.add(zone);
            c.zone = zone;

            zone.on('pointerdown', () => {
                if (this.gameState === 'GUESS' && !c.isRevealed && !this.isPeeking && !this.isWrongBlinking) {
                    this._onTileTapped(c);
                }
            });

            this.tilePool.push(c);
            this.tileContainer.add(c);
        }
    }

    _drawTileGraphics(tile, state, w, h) {
        tile.bodyG.clear();
        tile.shadow.clear();

        const halfW = w / 2, halfH = h / 2;
        const radius = Math.min(halfW, halfH) * 0.88;

        // Soft drop shadow circular
        tile.shadow.fillStyle(0x000000, 0.16);
        tile.shadow.fillCircle(0, 2, radius);

        if (state === 'REVEALED') {
            // Card Bulat Hitam Polos (Fase Hafal - Angka Putih)
            tile.bodyG.fillStyle(C.TILE_REVEALED, 1);
            tile.bodyG.fillCircle(0, 0, radius);
            tile.bodyG.lineStyle(1.5, 0x334155, 0.9);
            tile.bodyG.strokeCircle(0, 0, radius);

            tile.txt.setColor('#ffffff').setVisible(true);

        } else if (state === 'HIDDEN') {
            // Card Bulat Hitam Polos Tertutup (Fase Tebak)
            tile.bodyG.fillStyle(C.TILE_HIDDEN, 1);
            tile.bodyG.fillCircle(0, 0, radius);
            tile.bodyG.lineStyle(1.5, C.TILE_HIDDEN_BORDER, 0.9);
            tile.bodyG.strokeCircle(0, 0, radius);

            tile.txt.setVisible(false);

        } else if (state === 'CORRECT') {
            // Green Success Card (Terbuka Benar - Bulat Hijau Polos & Angka Putih)
            tile.bodyG.fillStyle(C.TILE_CORRECT, 1);
            tile.bodyG.fillCircle(0, 0, radius);
            tile.bodyG.lineStyle(1.5, 0x4ade80, 0.9);
            tile.bodyG.strokeCircle(0, 0, radius);

            tile.txt.setColor('#ffffff').setVisible(true);

        } else if (state === 'HINT') {
            // Amber Gold Hint Card (Bulat & Angka Putih)
            tile.bodyG.fillStyle(C.TILE_HINT, 1);
            tile.bodyG.fillCircle(0, 0, radius);
            tile.bodyG.lineStyle(1.5, 0xfde047, 0.9);
            tile.bodyG.strokeCircle(0, 0, radius);

            tile.txt.setColor('#ffffff').setVisible(true);

        } else if (state === 'WRONG_FLASH') {
            // Red Error Card (Bulat & Angka Putih)
            tile.bodyG.fillStyle(C.TILE_WRONG, 1);
            tile.bodyG.fillCircle(0, 0, radius);
            tile.bodyG.lineStyle(1.5, 0xfca5a5, 0.9);
            tile.bodyG.strokeCircle(0, 0, radius);

            tile.txt.setColor('#ffffff').setVisible(true);
        }
    }

    // ── Level Lifecycle ─────────────────────────────────────

    _restoreLevel(saved) {
        this.config = getLevelConfig(this.level);
        this.levelText.setText(this.config.isEndless ? `♾️ ${this.level - TOTAL_CAMPAIGN_LEVELS}` : `LV ${this.level}`);
        this._updateRuleBadge(this.config.orderRule);

        this.lives = typeof saved.lives === 'number' ? saved.lives : MAX_LIVES;
        this._updateLivesDisplay();

        this.score = typeof saved.score === 'number' ? saved.score : 0;
        this.combo = typeof saved.combo === 'number' ? saved.combo : 1;
        this.mistakesCount = typeof saved.mistakesCount === 'number' ? saved.mistakesCount : 0;
        this.usedPeek = false;
        this.isPeeking = false;
        this.isWrongBlinking = false;
        this.isPaused = false;

        this.scoreValText.setText(`${this.score}`);
        this.comboValText.setText(`COMBO x${this.combo}`);

        this.layout = { cells: saved.cards, signature: 0 };
        this.previousSignature = 0;

        if (this.config.orderRule === 'DESC') {
            this.targetValues = Array.from({ length: this.config.numCount }, (_, i) => this.config.numCount - i);
        } else {
            this.targetValues = Array.from({ length: this.config.numCount }, (_, i) => i + 1);
        }
        const matched = Array.isArray(saved.matched) ? saved.matched : [];
        this.targetIndex = matched.length;

        this._setupGridTiles();
        this.gameState = 'GUESS';
        this.phaseLabel.setText('TEBAK SESUAI URUTAN').setColor('#10b981');
        this.readyBtn.setVisible(false);
        this.peekBtn.setVisible(true);
        this._updatePeekButtonState();
        this._drawCountdownProgress(0);
        this.guessStartTime = performance.now() - (saved.elapsed || 0);

        const matchedSet = new Set(matched);
        this.activeTiles.forEach((tile) => {
            if (matchedSet.has(tile.val)) {
                tile.isRevealed = true;
                this._drawTileGraphics(tile, 'CORRECT', tile.tileSize, tile.tileSize);
            } else {
                tile.isRevealed = false;
                this._drawTileGraphics(tile, 'HIDDEN', tile.tileSize, tile.tileSize);
            }
        });
    }

    _startLevel(levelNumber) {
        this.level = levelNumber;
        sessionStore.clearGame('memory');
        this.config = getLevelConfig(levelNumber);

        this.levelText.setText(this.config.isEndless ? `♾️ ${this.level - TOTAL_CAMPAIGN_LEVELS}` : `LV ${this.level}`);
        this._updateRuleBadge(this.config.orderRule);

        this.lives = MAX_LIVES;
        this._updateLivesDisplay();

        this.score = this.score || 0;
        this.combo = 1;
        this.mistakesCount = 0;
        this.usedPeek = false;
        this.isPeeking = false;
        this.isWrongBlinking = false;
        this.isPaused = false;

        this.scoreValText.setText(`${this.score}`);
        this.comboValText.setText(`COMBO x${this.combo}`);

        // Generate layout
        this.layout = generateLevelLayout(this.config, this.attemptSalt, this.previousSignature);
        this.previousSignature = this.layout.signature;

        // Target sequence setup
        if (this.config.orderRule === 'DESC') {
            this.targetValues = Array.from({ length: this.config.numCount }, (_, i) => this.config.numCount - i);
        } else {
            this.targetValues = Array.from({ length: this.config.numCount }, (_, i) => i + 1);
        }
        this.targetIndex = 0;

        // Memorization timing with DDA
        this.baseShowMs = this.config.baseShowMs;
        this.memorizeTimerTotal = getAdjustedShowMs(this.baseShowMs);
        this.memorizeTimerElapsed = 0;

        this._setupGridTiles();
        this._enterMemorizePhase();
    }

    _setupGridTiles() {
        const cols = this.config.cols;
        const rows = this.config.rows;

        // Calculate tile sizes and margins inside BOARD_AREA
        const availW = BOARD_AREA.WIDTH;
        const availH = BOARD_AREA.HEIGHT;

        const gap = 8;
        const maxTileW = Math.floor((availW - (cols - 1) * gap) / cols);
        const maxTileH = Math.floor((availH - (rows - 1) * gap) / rows);
        const tileSize = Math.min(maxTileW, maxTileH, 68);

        const totalGridW = cols * tileSize + (cols - 1) * gap;
        const totalGridH = rows * tileSize + (rows - 1) * gap;

        const startX = BOARD_AREA.X + (availW - totalGridW) / 2 + tileSize / 2;
        const startY = BOARD_AREA.Y + (availH - totalGridH) / 2 + tileSize / 2;

        // Hide all pooled tiles first
        this.tilePool.forEach(t => t.setVisible(false).setActive(false));

        // Configure active tiles from layout
        this.activeTiles = [];
        this.layout.cells.forEach((cellData, i) => {
            const tile = this.tilePool[i];
            const px = startX + cellData.col * (tileSize + gap);
            const py = startY + cellData.row * (tileSize + gap);

            tile.setPosition(px, py);
            tile.tileSize = tileSize;
            tile.cellData = cellData;
            tile.val = cellData.value;
            tile.isRevealed = false;
            tile.zone.setSize(tileSize, tileSize);

            // Font size adjustment for 2-digit numbers on tiles (enlarged for high clarity)
            const fontSize = tileSize < 48 ? '16px' : (tileSize < 58 ? '19px' : '23px');
            tile.txt.setText(`${cellData.value}`).setFontSize(fontSize);

            this._drawTileGraphics(tile, 'REVEALED', tileSize, tileSize);
            tile.setVisible(true).setActive(true);
            tile.setScale(0);

            // Pop-in animation
            this.tweens.add({
                targets: tile,
                scaleX: 1, scaleY: 1,
                duration: 220,
                delay: i * 35,
                ease: 'Back.easeOut'
            });

            this.activeTiles.push(tile);
        });
    }

    _enterMemorizePhase() {
        this.gameState = 'MEMORIZE';
        this.phaseLabel.setText('HAFALKAN POSISI ANGKA').setColor('#3b82f6');
        this.readyBtn.setVisible(true);
        this.peekBtn.setVisible(false);

        this._drawCountdownProgress(1.0);

        if (this.countdownEvent) {
            this.countdownEvent.remove(false);
        }

        const stepMs = 50;
        this.countdownEvent = this.time.addEvent({
            delay: stepMs,
            loop: true,
            callback: () => {
                if (this.gameState !== 'MEMORIZE' || this.isPaused) return;

                this.memorizeTimerElapsed += stepMs;
                const remaining = Math.max(0, this.memorizeTimerTotal - this.memorizeTimerElapsed);
                const pct = remaining / this.memorizeTimerTotal;
                this._drawCountdownProgress(pct);

                if (remaining <= 0) {
                    this._finishMemorizePhase();
                }
            }
        });
    }

    _finishMemorizePhase() {
        if (this.countdownEvent) {
            this.countdownEvent.remove(false);
            this.countdownEvent = null;
        }

        this.gameState = 'GUESS';
        this.guessStartTime = performance.now();
        this.phaseLabel.setText('TEBAK SESUAI URUTAN').setColor('#10b981');
        this._drawCountdownProgress(0);

        this.readyBtn.setVisible(false);
        this.peekBtn.setVisible(true);
        this._updatePeekButtonState();

        // Flip tiles to HIDDEN
        this.activeTiles.forEach((tile, idx) => {
            this.tweens.add({
                targets: tile,
                scaleX: 0,
                duration: 120,
                delay: idx * 25,
                ease: 'Cubic.easeIn',
                onComplete: () => {
                    this._drawTileGraphics(tile, 'HIDDEN', tile.tileSize, tile.tileSize);
                    this.tweens.add({
                        targets: tile,
                        scaleX: 1,
                        duration: 120,
                        ease: 'Cubic.easeOut'
                    });
                }
            });
        });
    }

    // ── Interaction & Game Rules ────────────────────────────

    _onTileTapped(tile) {
        const expectedVal = this.targetValues[this.targetIndex];

        if (tile.val === expectedVal) {
            // ✅ CORRECT TAP
            tile.isRevealed = true;
            this.audio.playCorrectTap(this.combo);
            triggerHaptic(15);

            // Flip to green correct card
            this.tweens.add({
                targets: tile,
                scaleX: 0,
                duration: 100,
                ease: 'Cubic.easeIn',
                onComplete: () => {
                    this._drawTileGraphics(tile, 'CORRECT', tile.tileSize, tile.tileSize);
                    this.tweens.add({
                        targets: tile,
                        scaleX: 1.1, scaleY: 1.1,
                        yoyo: true, duration: 90,
                        ease: 'Back.easeOut'
                    });
                }
            });

            // Score with combo multiplier
            const points = BASE_SCORE_PER_TAP * this.combo;
            this.score += points;
            this.scoreValText.setText(`${this.score}`);

            this.combo = Math.min(MAX_COMBO, this.combo + 1);
            this.comboValText.setText(`COMBO x${this.combo}`).setColor(this.combo >= 4 ? '#ea580c' : '#b45309');

            this.targetIndex++;

            // Check if level completed
            if (this.targetIndex >= this.targetValues.length) {
                this._handleLevelSuccess();
            } else {
                sessionStore.setGame('memory', {
                    level: this.level,
                    cards: this.layout.cells,
                    flipped: [],
                    matched: this.activeTiles.filter(t => t.isRevealed).map(t => t.val),
                    moves: this.targetIndex + this.mistakesCount,
                    elapsed: Math.round(performance.now() - this.guessStartTime),
                    score: this.score,
                    combo: this.combo,
                    lives: this.lives,
                    mistakesCount: this.mistakesCount
                });
            }

        } else {
            // ❌ WRONG TAP
            this.mistakesCount++;
            this.combo = 1;
            this.comboValText.setText('COMBO x1').setColor('#b45309');

            this.lives--;
            this._updateLivesDisplay();
            this.audio.playWrongTap();
            triggerHaptic([40, 30, 80]);
            this.cameras.main.shake(160, 0.008);

            // Flash tapped tile red
            this._drawTileGraphics(tile, 'WRONG_FLASH', tile.tileSize, tile.tileSize);
            this.time.delayedCall(220, () => {
                if (!tile.isRevealed) {
                    this._drawTileGraphics(tile, 'HIDDEN', tile.tileSize, tile.tileSize);
                }
            });

            // Blink the correct target tile for 600ms as a learning hint
            const correctTile = this.activeTiles.find(t => t.val === expectedVal);
            if (correctTile && !correctTile.isRevealed) {
                this.isWrongBlinking = true;
                this._drawTileGraphics(correctTile, 'HINT', correctTile.tileSize, correctTile.tileSize);
                this.tweens.add({
                    targets: correctTile,
                    scaleX: 1.12, scaleY: 1.12,
                    yoyo: true, repeat: 1, duration: 150,
                    onComplete: () => {
                        this.time.delayedCall(WRONG_BLINK_MS, () => {
                            if (!correctTile.isRevealed) {
                                this._drawTileGraphics(correctTile, 'HIDDEN', correctTile.tileSize, correctTile.tileSize);
                            }
                            this.isWrongBlinking = false;
                        });
                    }
                });
            }

            // Check Game Over
            if (this.lives <= 0) {
                this._handleGameOver();
            }
        }
    }

    _usePeekHint() {
        if (this.usedPeek || this.isPeeking) return;
        this.usedPeek = true;
        this.isPeeking = true;
        this._updatePeekButtonState();

        this.audio.playPeek();
        triggerHaptic(20);

        const nextVal = this.targetValues[this.targetIndex];
        const nextTile = this.activeTiles.find(t => t.val === nextVal);

        if (nextTile) {
            this._drawTileGraphics(nextTile, 'HINT', nextTile.tileSize, nextTile.tileSize);
            this.tweens.add({
                targets: nextTile,
                scaleX: 1.15, scaleY: 1.15,
                yoyo: true, duration: 140
            });

            this.time.delayedCall(PEEK_DURATION_MS, () => {
                if (!nextTile.isRevealed) {
                    this._drawTileGraphics(nextTile, 'HIDDEN', nextTile.tileSize, nextTile.tileSize);
                }
                this.isPeeking = false;
            });
        }
    }

    // ── Level Success & Win Modal ───────────────────────────

    _handleLevelSuccess() {
        this.gameState = 'RESULT';
        sessionStore.clearGame('memory');
        const totalDuration = performance.now() - (this.guessStartTime || performance.now());
        const timeRatio = Math.min(1.0, totalDuration / (this.config.numCount * 2500));

        // Star Calculation
        let stars = 3;
        if (this.mistakesCount >= 2) {
            stars = 1;
        } else if (this.mistakesCount === 1 || this.usedPeek) {
            stars = 2;
        }

        // DDA record
        recordLevelAttempt({
            level: this.level,
            success: true,
            mistakes: this.mistakesCount,
            usedPeek: this.usedPeek,
            timeRatio
        });

        // Persist Storage
        saveMemoryUnlockedLevel(this.level + 1);
        saveMemoryLevelStars(this.level, stars);
        saveMemoryLevelScore(this.level, this.score);
        saveMemoryTotalScore(this.score);

        this.audio.playMilestone();
        triggerHaptic([25, 25, 45]);

        if (stars === 3) {
            this._spawnConfetti();
        }

        // Show Win Modal
        this.time.delayedCall(400, () => {
            this._showResultModal(stars);
        });
    }

    _handleGameOver() {
        this.gameState = 'GAMEOVER';
        sessionStore.clearGame('memory');

        recordLevelAttempt({
            level: this.level,
            success: false,
            mistakes: this.mistakesCount,
            usedPeek: this.usedPeek,
            timeRatio: 1.0
        });

        this.audio.playGameOver();
        triggerHaptic([60, 60, 100]);

        this.time.delayedCall(500, () => {
            this._showGameOverModal();
        });
    }

    // ── Result & GameOver Modals (Identical Tenten Styling) ──

    _buildResultModal() {
        this.resultContainer = this.add.container(0, 0).setDepth(100).setVisible(false);

        const dim = this.add.graphics();
        dim.fillStyle(0x0f172a, 0.65);
        dim.fillRect(0, 0, 360, 640);
        this.resultContainer.add(dim);

        const cardW = 280, cardH = 300;
        const cardX = 180 - cardW / 2, cardY = 160;
        const cardBg = this.add.graphics();
        this._drawCard(cardBg, cardX, cardY, cardW, cardH);
        this.resultContainer.add(cardBg);

        // Title: LEVEL SELESAI
        this.resTitle = this.add.text(180, cardY + 28, 'LEVEL SELESAI!', {
            fontFamily: FONT_PIXEL, fontSize: '14px', color: '#16a34a'
        }).setOrigin(0.5).setResolution(2);
        this.resultContainer.add(this.resTitle);

        // Stars Display
        this.resStarsText = this.add.text(180, cardY + 62, '⭐⭐⭐', {
            fontSize: '26px'
        }).setOrigin(0.5);
        this.resultContainer.add(this.resStarsText);

        // Score Label
        this.resScoreLabel = this.add.text(180, cardY + 98, 'SKOR ANDA', {
            fontFamily: FONT_PIXEL, fontSize: '8.5px', color: '#64748b'
        }).setOrigin(0.5).setResolution(2);
        this.resultContainer.add(this.resScoreLabel);

        this.resScoreVal = this.add.text(180, cardY + 124, '0', {
            fontFamily: FONT_PIXEL, fontSize: '23px', color: '#1e293b'
        }).setOrigin(0.5).setResolution(2);
        this.resultContainer.add(this.resScoreVal);

        // Mistakes & Hint info
        this.resSubtext = this.add.text(180, cardY + 154, 'Sempurna tanpa kesalahan!', {
            fontFamily: FONT_UI, fontSize: '11.5px', color: '#64748b'
        }).setOrigin(0.5).setResolution(3);
        this.resultContainer.add(this.resSubtext);

        // Button: Lanjut Level Berikutnya
        const btnW = 220, btnH = 40;
        const btnNextY = cardY + 195;
        const btnNext = this.add.graphics();
        this._drawButton(btnNext, 180 - btnW / 2, btnNextY, btnW, btnH, C.BTN_GREEN);
        this.resultContainer.add(btnNext);

        const btnNextTxt = this.add.text(180, btnNextY + btnH / 2, 'LANJUT LEVEL', {
            fontFamily: FONT_PIXEL, fontSize: '10px', color: '#ffffff'
        }).setOrigin(0.5).setResolution(2);
        this.resultContainer.add(btnNextTxt);

        const nextHit = this.add.zone(180, btnNextY + btnH / 2, btnW, btnH).setInteractive({ useHandCursor: true });
        this.resultContainer.add(nextHit);
        nextHit.on('pointerdown', () => {
            triggerHaptic(20);
            this.resultContainer.setVisible(false);
            this.attemptSalt = 0;
            this._startLevel(this.level + 1);
        });

        // Button: Menu / Level Select
        const btnMenuY = btnNextY + btnH + 10;
        const btnMenu = this.add.graphics();
        this._drawButton(btnMenu, 180 - btnW / 2, btnMenuY, btnW, 32, C.BTN_BG);
        this.resultContainer.add(btnMenu);

        const btnMenuTxt = this.add.text(180, btnMenuY + 16, 'PILIH LEVEL', {
            fontFamily: FONT_PIXEL, fontSize: '9px', color: '#ffffff'
        }).setOrigin(0.5).setResolution(2);
        this.resultContainer.add(btnMenuTxt);

        const menuHit = this.add.zone(180, btnMenuY + 16, btnW, 32).setInteractive({ useHandCursor: true });
        this.resultContainer.add(menuHit);
        menuHit.on('pointerdown', () => {
            triggerHaptic(15);
            this.cameras.main.fadeOut(180, 241, 245, 249);
            this.time.delayedCall(180, () => {
                this.scene.start('MemoryLevelSelectScene');
            });
        });
    }

    _showResultModal(stars) {
        this.resStarsText.setText(stars === 3 ? '⭐⭐⭐' : stars === 2 ? '⭐⭐☆' : '⭐☆☆');
        this.resScoreVal.setText(`${this.score}`);

        if (stars === 3) {
            this.resSubtext.setText('Luar Biasa! 3 Bintang Sempurna! 🎉');
        } else if (stars === 2) {
            this.resSubtext.setText('Bagus! Selesai dengan 1 catatan.');
        } else {
            this.resSubtext.setText('Berhasil! Coba lagi untuk 3 bintang.');
        }

        this.resultContainer.setVisible(true).setAlpha(0);
        this.tweens.add({ targets: this.resultContainer, alpha: 1, duration: 250 });
    }

    _buildGameOverModal() {
        this.gameOverContainer = this.add.container(0, 0).setDepth(100).setVisible(false);

        const dim = this.add.graphics();
        dim.fillStyle(0x0f172a, 0.65);
        dim.fillRect(0, 0, 360, 640);
        this.gameOverContainer.add(dim);

        const cardW = 270, cardH = 260;
        const cardX = 180 - cardW / 2, cardY = 180;
        const cardBg = this.add.graphics();
        this._drawCard(cardBg, cardX, cardY, cardW, cardH);
        this.gameOverContainer.add(cardBg);

        const title = this.add.text(180, cardY + 28, 'NYAWA HABIS!', {
            fontFamily: FONT_PIXEL, fontSize: '14px', color: '#ef4444'
        }).setOrigin(0.5).setResolution(2);
        this.gameOverContainer.add(title);

        const sub = this.add.text(180, cardY + 60, 'Jangan menyerah, coba lagi!', {
            fontFamily: FONT_UI, fontSize: '12px', color: '#64748b'
        }).setOrigin(0.5).setResolution(3);
        this.gameOverContainer.add(sub);

        // Score display
        const scLabel = this.add.text(180, cardY + 95, 'SKOR ANDA', {
            fontFamily: FONT_PIXEL, fontSize: '8.5px', color: '#64748b'
        }).setOrigin(0.5).setResolution(2);
        this.gameOverContainer.add(scLabel);

        this.goScoreVal = this.add.text(180, cardY + 120, '0', {
            fontFamily: FONT_PIXEL, fontSize: '22px', color: '#1e293b'
        }).setOrigin(0.5).setResolution(2);
        this.gameOverContainer.add(this.goScoreVal);

        // Button: Ulang Level
        const btnW = 200, btnH = 40;
        const btnRetryY = cardY + 155;
        const btnRetry = this.add.graphics();
        this._drawButton(btnRetry, 180 - btnW / 2, btnRetryY, btnW, btnH, C.BTN_BG);
        this.gameOverContainer.add(btnRetry);

        const retryTxt = this.add.text(180, btnRetryY + btnH / 2, 'ULANG LEVEL', {
            fontFamily: FONT_PIXEL, fontSize: '10px', color: '#ffffff'
        }).setOrigin(0.5).setResolution(2);
        this.gameOverContainer.add(retryTxt);

        const retryHit = this.add.zone(180, btnRetryY + btnH / 2, btnW, btnH).setInteractive({ useHandCursor: true });
        this.gameOverContainer.add(retryHit);
        retryHit.on('pointerdown', () => {
            triggerHaptic(20);
            this.gameOverContainer.setVisible(false);
            this.attemptSalt++; // New layout on retry
            this._startLevel(this.level);
        });

        // Button: Pilih Level
        const btnMenuY = btnRetryY + btnH + 10;
        const btnMenu = this.add.graphics();
        this._drawButton(btnMenu, 180 - btnW / 2, btnMenuY, btnW, 30, 0x64748b);
        this.gameOverContainer.add(btnMenu);

        const menuTxt = this.add.text(180, btnMenuY + 15, 'PILIH LEVEL', {
            fontFamily: FONT_PIXEL, fontSize: '9px', color: '#ffffff'
        }).setOrigin(0.5).setResolution(2);
        this.gameOverContainer.add(menuTxt);

        const menuHit = this.add.zone(180, btnMenuY + 15, btnW, 30).setInteractive({ useHandCursor: true });
        this.gameOverContainer.add(menuHit);
        menuHit.on('pointerdown', () => {
            triggerHaptic(15);
            this.cameras.main.fadeOut(180, 241, 245, 249);
            this.time.delayedCall(180, () => {
                this.scene.start('MemoryLevelSelectScene');
            });
        });
    }

    _showGameOverModal() {
        this.goScoreVal.setText(`${this.score}`);
        this.gameOverContainer.setVisible(true).setAlpha(0);
        this.tweens.add({ targets: this.gameOverContainer, alpha: 1, duration: 250 });
    }

    // ── Pause Modal (Minimalist 3 Action Cards) ──────────────

    _buildPauseModal() {
        this.pauseContainer = this.add.container(0, 0).setDepth(100).setVisible(false);

        const dim = this.add.graphics();
        dim.fillStyle(0x0f172a, 0.65);
        dim.fillRect(0, 0, 360, 640);
        this.pauseContainer.add(dim);

        // Clean Modal Card Centered Perfectly (No text)
        const modalW = 200, modalH = 200;
        const modalX = 180 - modalW / 2, modalY = 320 - modalH / 2;
        const modalBg = this.add.graphics();
        this._drawCard(modalBg, modalX, modalY, modalW, modalH);
        this.pauseContainer.add(modalBg);

        // 4 Action Cards in 2x2 Grid Centered:
        // Baris 1: Resume (▶), Restart (↺)
        // Baris 2: Audio Toggle (🔊/🔇), Keluar Menu Level (🚪/⬅)
        const cardSize = 64;
        const col1X = 180 - 39;
        const col2X = 180 + 39;
        const row1Y = 320 - 39;
        const row2Y = 320 + 39;

        // 1. Resume Card (▶)
        const resumeCard = this._buildActionCard(col1X, row1Y, cardSize, 'resume', () => {
            triggerHaptic(15);
            this._togglePause(false);
        });
        this.pauseContainer.add(resumeCard);

        // 2. Restart Card (↺)
        const restartCard = this._buildActionCard(col2X, row1Y, cardSize, 'restart', () => {
            triggerHaptic(20);
            this._togglePause(false);
            this.attemptSalt++;
            this._startLevel(this.level);
        });
        this.pauseContainer.add(restartCard);

        // 3. Audio Toggle Card (🔊 / 🔇)
        const soundCard = this._buildActionCard(col1X, row2Y, cardSize, 'audio', () => {
            this.audio.toggleMute();
            this._drawAudioIcon();
            this._drawCardAudioIcon();
            triggerHaptic(15);
        });
        this.pauseContainer.add(soundCard);

        // 4. Keluar ke Menu Level Card (🚪/⬅)
        const exitCard = this._buildActionCard(col2X, row2Y, cardSize, 'exit', () => {
            sessionStore.clearGame('memory');
            triggerHaptic(15);
            this.cameras.main.fadeOut(180, 241, 245, 249);
            this.time.delayedCall(180, () => {
                this.scene.start('MemoryLevelSelectScene');
            });
        });
        this.pauseContainer.add(exitCard);
    }

    _buildActionCard(x, y, size, type, onAction) {
        const c = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(0xffffff, 1);
        bg.fillRoundedRect(-size / 2, -size / 2, size, size, 12);
        bg.lineStyle(1.5, 0xe2e8f0, 1);
        bg.strokeRoundedRect(-size / 2, -size / 2, size, size, 12);
        c.add(bg);

        const iconG = this.add.graphics();
        c.add(iconG);

        if (type === 'resume') {
            iconG.fillStyle(0x1e293b, 1);
            iconG.fillTriangle(-8, -14, -8, 14, 12, 0);
        } else if (type === 'restart') {
            if (this.textures.exists('restart-icon')) {
                const restartImg = this.add.image(0, 0, 'restart-icon')
                    .setDisplaySize(34, 34)
                    .setOrigin(0.5);
                c.add(restartImg);
            } else {
                iconG.fillStyle(0x1e293b, 1);
                iconG.fillCircle(0, 0, 10);
            }
        } else if (type === 'audio') {
            this.pauseAudioIconG = iconG;
            this._drawCardAudioIcon();
        } else if (type === 'exit') {
            // Icon Keluar ke Menu Level (Frame Pintu + Panah Keluar)
            iconG.lineStyle(2.5, 0xef4444, 1);
            iconG.beginPath();
            iconG.moveTo(1, -12);
            iconG.lineTo(11, -12);
            iconG.lineTo(11, 12);
            iconG.lineTo(1, 12);
            iconG.strokePath();

            iconG.lineBetween(4, 0, -11, 0);
            iconG.fillStyle(0xef4444, 1);
            iconG.fillTriangle(-12, 0, -5, -6, -5, 6);
        }

        const zone = this.add.zone(0, 0, size, size).setInteractive({ useHandCursor: true });
        c.add(zone);

        zone.on('pointerdown', () => {
            this.tweens.killTweensOf(c);
            c.setScale(0.88);
            this.tweens.add({
                targets: c,
                scaleX: 1, scaleY: 1,
                duration: 160,
                ease: 'Back.easeOut',
                onComplete: onAction
            });
        });

        return c;
    }

    _drawCardAudioIcon() {
        if (!this.pauseAudioIconG) return;
        this.pauseAudioIconG.clear();
        const isMuted = this.audio.getIsMuted();
        const color = isMuted ? 0x94a3b8 : 0x1e293b;
        this.pauseAudioIconG.fillStyle(color, 1);

        this.pauseAudioIconG.fillRect(-12, -5, 5, 10);
        this.pauseAudioIconG.fillTriangle(-7, -5, -7, 5, 3, 12);
        this.pauseAudioIconG.fillTriangle(-7, -5, 3, 12, 3, -12);

        if (isMuted) {
            this.pauseAudioIconG.lineStyle(2.5, 0xef4444, 1);
            this.pauseAudioIconG.lineBetween(-13, 12, 13, -12);
        } else {
            this.pauseAudioIconG.lineStyle(2.5, 0x1e293b, 1);
            this.pauseAudioIconG.beginPath();
            this.pauseAudioIconG.arc(2, 0, 8, -Math.PI / 3, Math.PI / 3, false);
            this.pauseAudioIconG.strokePath();
            this.pauseAudioIconG.beginPath();
            this.pauseAudioIconG.arc(2, 0, 15, -Math.PI / 3, Math.PI / 3, false);
            this.pauseAudioIconG.strokePath();
        }
    }

    _togglePause(paused) {
        this.isPaused = paused;
        this.pauseContainer.setVisible(paused);
        if (paused) {
            this._drawCardAudioIcon();
            this.pauseContainer.setAlpha(0);
            this.tweens.add({ targets: this.pauseContainer, alpha: 1, duration: 150 });
        }
    }

    _setupAutoPause() {
        this._onVisibilityChange = () => {
            if (document.hidden && this.scene.isActive() && (this.gameState === 'MEMORIZE' || this.gameState === 'GUESS') && !this.isPaused) {
                this._togglePause(true);
            }
        };
        document.addEventListener('visibilitychange', this._onVisibilityChange);
        this.events.once('shutdown', () => {
            document.removeEventListener('visibilitychange', this._onVisibilityChange);
        });
    }

    // ── Helper Drawings (Identical Tenten) ───────────────────

    _drawCard(g, x, y, w, h) {
        g.fillStyle(0x000000, 0.08);
        g.fillRoundedRect(x + 2, y + 2, w, h, 12);
        g.fillStyle(C.CARD_BG, 1);
        g.fillRoundedRect(x, y, w, h, 12);
        g.lineStyle(1, C.CARD_BORDER, 0.6);
        g.strokeRoundedRect(x, y, w, h, 12);
    }

    _drawButton(g, x, y, w, h, bgColor = C.BTN_BG) {
        g.fillStyle(bgColor, 1);
        g.fillRoundedRect(x, y, w, h, 8);
        g.fillStyle(0xffffff, 0.15);
        g.fillRoundedRect(x, y, w, h / 2, { tl: 8, tr: 8, bl: 0, br: 0 });
    }

    _floatText(text, x, y, color = '#3b82f6') {
        const t = this.add.text(x, y, text, {
            fontFamily: FONT_PIXEL,
            fontSize: '8px',
            color: color
        }).setOrigin(0.5).setResolution(2).setDepth(80);

        this.tweens.add({
            targets: t,
            y: y - 30,
            alpha: 0,
            duration: 800,
            ease: 'Cubic.easeOut',
            onComplete: () => t.destroy()
        });
    }

    _spawnConfetti() {
        const colors = [0xf43f5e, 0xfacc15, 0x06b6d4, 0x84cc16, 0xa855f7, 0xfb923c];
        for (let i = 0; i < 35; i++) {
            let p = this.confettiPool.find(item => !item.active);
            if (!p) {
                p = this.add.graphics().setDepth(110);
                this.confettiPool.push(p);
            }
            const sz = Phaser.Math.Between(3, 6);
            p.clear();
            p.fillStyle(Phaser.Utils.Array.GetRandom(colors), 1);
            p.fillRect(0, 0, sz, sz);
            p.setPosition(Phaser.Math.Between(30, 330), Phaser.Math.Between(-20, -60))
                .setAlpha(1).setScale(1).setVisible(true).setActive(true);

            this.tweens.killTweensOf(p);
            this.tweens.add({
                targets: p,
                y: Phaser.Math.Between(200, 620),
                x: p.x + Phaser.Math.Between(-40, 40),
                angle: Phaser.Math.Between(-180, 180),
                alpha: 0,
                duration: Phaser.Math.Between(800, 1600),
                delay: Phaser.Math.Between(0, 400),
                ease: 'Cubic.easeIn',
                onComplete: () => p.setActive(false).setVisible(false)
            });
        }
    }
}
