/**
 * Level Selection Scene for Memory Angka.
 * Clean, high-DPI pagination for 30 campaign levels + Endless mode node.
 * Reuses BPS styling, palettes, and WebAudio sounds.
 */

import Phaser from 'phaser';
import {
    FONT_PIXEL,
    FONT_UI,
    C
} from '../data/Constants.js';
import { TOTAL_CAMPAIGN_LEVELS } from '../data/Levels.js';
import { RetroAudio, triggerHaptic } from '../../../shared/Audio.js';
import {
    getMemoryUnlockedLevel,
    getMemoryLevelStars,
    getMemoryTotalStars
} from '../../../shared/Storage.js';

export class LevelSelectScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MemoryLevelSelectScene' });
        this.audio = new RetroAudio();
        this.currentPage = 0; // 0: 1-15, 1: 16-30
    }

    preload() {
        this.load.image('logo-bps', 'assets/logo-bps.webp');
        this.load.image('mahkota', 'assets/mahkota-icon.webp');
        this.load.image('restart-icon', 'assets/restart-icon.webp');
    }

    create() {
        this.cameras.main.resetFX();
        const dpr = this.game.config.width / 360;
        this.cameras.main.setZoom(dpr);
        this.cameras.main.centerOn(180, 320);

        this.unlockedLevel = Math.max(TOTAL_CAMPAIGN_LEVELS, getMemoryUnlockedLevel());
        this.starsData = getMemoryLevelStars();
        this.totalStars = getMemoryTotalStars();

        this._buildBackground();
        this._buildHeader();
        this._buildPageSelector();
        this._buildLevelGrid();
        this._buildEndlessButton();

        // Fade in
        this.cameras.main.fadeIn(200, 241, 245, 249);
    }

    _buildBackground() {
        const g = this.add.graphics();
        g.fillStyle(C.BG_BASE, 1);
        g.fillRect(0, 0, 360, 640);
    }

    _buildHeader() {
        const topY = 24;

        // 1. Tombol Kembali ke Hub
        this.backBtn = this.add.container(26, topY).setDepth(20);
        const backBg = this.add.graphics();
        backBg.fillStyle(0xffffff, 1);
        backBg.fillRoundedRect(-15, -15, 30, 30, 8);
        backBg.lineStyle(1, C.CELL_BORDER, 0.8);
        backBg.strokeRoundedRect(-15, -15, 30, 30, 8);
        this.backBtn.add(backBg);

        const backArrow = this.add.text(0, 0, '◀', {
            fontFamily: FONT_PIXEL,
            fontSize: '10px',
            color: '#1e293b'
        }).setOrigin(0.5).setResolution(4);
        this.backBtn.add(backArrow);

        const backHit = this.add.zone(0, 0, 34, 34).setInteractive({ useHandCursor: true });
        this.backBtn.add(backHit);
        backHit.on('pointerdown', () => {
            triggerHaptic(15);
            this.audio.playPickup();
            this.cameras.main.fadeOut(180, 241, 245, 249);
            this.time.delayedCall(180, () => {
                this.scene.start('HubScene');
            });
        });

        // 2. Title & Subtitle BPS
        this.add.text(54, topY - 7, 'MEMORY ANGKA', {
            fontFamily: FONT_UI,
            fontSize: '16px',
            fontStyle: '800',
            color: C.SCORE_VAL
        }).setOrigin(0, 0.5).setResolution(3).setDepth(20);

        this.add.text(54, topY + 7, 'Pilih Level Permainan', {
            fontFamily: FONT_UI,
            fontSize: '10.5px',
            fontStyle: '400',
            color: C.SUBTEXT
        }).setOrigin(0, 0.5).setResolution(3).setDepth(20);

        // 3. Audio Toggle Button
        this.audioBtn = this.add.container(334, topY).setDepth(20);
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
            triggerHaptic(15);
        });

        // 4. Total Stars Badge Pill (Center Bar)
        const starPillY = 62;
        const pillBg = this.add.graphics().setDepth(20);
        pillBg.fillStyle(0xffffff, 1);
        pillBg.fillRoundedRect(180 - 75, starPillY - 14, 150, 28, 8);
        pillBg.lineStyle(1, C.CELL_BORDER, 0.8);
        pillBg.strokeRoundedRect(180 - 75, starPillY - 14, 150, 28, 8);

        this.add.text(180, starPillY, `⭐ ${this.totalStars} / 90 BINTANG`, {
            fontFamily: FONT_PIXEL,
            fontSize: '8.5px',
            color: '#b45309'
        }).setOrigin(0.5).setResolution(4).setDepth(20);
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

    _buildPageSelector() {
        const tabY = 100;
        this.tabContainer = this.add.container(180, tabY);

        // Tab 1: Lv 1 - 15
        this.tab1 = this._createTabBtn(-60, 0, 'LEVEL 1-15', 0);
        // Tab 2: Lv 16 - 30
        this.tab2 = this._createTabBtn(60, 0, 'LEVEL 16-30', 1);

        this.tabContainer.add([this.tab1, this.tab2]);
        this._updateTabStyles();
    }

    _createTabBtn(x, y, label, pageIdx) {
        const c = this.add.container(x, y);
        const bg = this.add.graphics();
        c.add(bg);
        c.bg = bg;

        const txt = this.add.text(0, 0, label, {
            fontFamily: FONT_PIXEL,
            fontSize: '7px',
            color: '#1e293b'
        }).setOrigin(0.5).setResolution(4);
        c.add(txt);
        c.txt = txt;

        const hit = this.add.zone(0, 0, 108, 26).setInteractive({ useHandCursor: true });
        c.add(hit);

        hit.on('pointerdown', () => {
            if (this.currentPage !== pageIdx) {
                this.currentPage = pageIdx;
                this.audio.playPickup();
                triggerHaptic(15);
                this._updateTabStyles();
                this._buildLevelGrid();
            }
        });

        return c;
    }

    _updateTabStyles() {
        const tabs = [this.tab1, this.tab2];
        tabs.forEach((tab, idx) => {
            const active = this.currentPage === idx;
            tab.bg.clear();
            if (active) {
                tab.bg.fillStyle(C.BTN_BG, 1);
                tab.bg.fillRoundedRect(-54, -13, 108, 26, 6);
                tab.txt.setColor('#ffffff');
            } else {
                tab.bg.fillStyle(0xffffff, 1);
                tab.bg.fillRoundedRect(-54, -13, 108, 26, 6);
                tab.bg.lineStyle(1, C.CELL_BORDER, 0.8);
                tab.bg.strokeRoundedRect(-54, -13, 108, 26, 6);
                tab.txt.setColor('#64748b');
            }
        });
    }

    _buildLevelGrid() {
        if (this.gridContainer) {
            this.gridContainer.destroy();
        }
        this.gridContainer = this.add.container(0, 0);

        const startLvl = this.currentPage === 0 ? 1 : 16;
        const endLvl = this.currentPage === 0 ? 15 : 30;

        const cols = 3;
        const rows = 5;
        const cardW = 96;
        const cardH = 68;
        const gapX = 14;
        const gapY = 12;
        const startX = 180 - (cols * cardW + (cols - 1) * gapX) / 2 + cardW / 2;
        const startY = 138 + cardH / 2;

        let index = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const lvl = startLvl + index;
                if (lvl > endLvl) break;

                const x = startX + c * (cardW + gapX);
                const y = startY + r * (cardH + gapY);

                const node = this._createLevelNode(x, y, cardW, cardH, lvl);
                this.gridContainer.add(node);
                index++;
            }
        }
    }

    _createLevelNode(x, y, w, h, lvl) {
        const c = this.add.container(x, y);
        const isUnlocked = lvl <= this.unlockedLevel;
        const stars = this.starsData[lvl] || 0;
        const isDesc = (lvl >= 10 && lvl % 5 === 0);

        const bg = this.add.graphics();
        // Shadow
        bg.fillStyle(0x000000, 0.06);
        bg.fillRoundedRect(-w / 2 + 1, -h / 2 + 1, w, h, 8);

        if (isUnlocked) {
            bg.fillStyle(0xffffff, 1);
            bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
            bg.lineStyle(1.5, stars === 3 ? 0xf59e0b : C.CELL_BORDER, 1);
            bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);

            // Level Text
            const lvlTxt = this.add.text(0, -14, `LV ${lvl}`, {
                fontFamily: FONT_PIXEL,
                fontSize: '11.5px',
                color: C.SCORE_VAL
            }).setOrigin(0.5).setResolution(4);
            c.add(lvlTxt);

            // Rule tag if DESC
            if (isDesc) {
                const tag = this.add.text(0, 0, 'TURUN ↘', {
                    fontFamily: FONT_PIXEL,
                    fontSize: '6.5px',
                    color: '#ea580c'
                }).setOrigin(0.5).setResolution(4);
                c.add(tag);
            }

            // Stars display
            const starsTxt = stars === 3 ? '⭐⭐⭐' : stars === 2 ? '⭐⭐' : stars === 1 ? '⭐' : '☆☆☆';
            const starColor = stars > 0 ? '#b45309' : '#94a3b8';
            const st = this.add.text(0, isDesc ? 16 : 10, starsTxt, {
                fontFamily: FONT_PIXEL,
                fontSize: '8px',
                color: starColor
            }).setOrigin(0.5).setResolution(4);
            c.add(st);

            // Interaction
            const hit = this.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
            c.add(hit);

            hit.on('pointerdown', () => {
                triggerHaptic(20);
                this.audio.playPickup();
                this.tweens.killTweensOf(c);
                c.setScale(0.92);
                this.tweens.add({
                    targets: c,
                    scaleX: 1, scaleY: 1,
                    duration: 140, ease: 'Back.easeOut',
                    onComplete: () => {
                        this.cameras.main.fadeOut(180, 241, 245, 249);
                        this.time.delayedCall(180, () => {
                            this.scene.start('MemoryScene', { level: lvl });
                        });
                    }
                });
            });

        } else {
            // Locked Node
            bg.fillStyle(0xe2e8f0, 0.7);
            bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
            bg.lineStyle(1, 0xcbd5e1, 0.8);
            bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);

            const lockTxt = this.add.text(0, -4, '🔒', {
                fontSize: '15px'
            }).setOrigin(0.5);
            c.add(lockTxt);

            const numTxt = this.add.text(0, 16, `${lvl}`, {
                fontFamily: FONT_PIXEL,
                fontSize: '8px',
                color: '#94a3b8'
            }).setOrigin(0.5).setResolution(4);
            c.add(numTxt);
        }

        c.addAt(bg, 0);
        return c;
    }

    _buildEndlessButton() {
        const btnY = 590;
        const btnW = 320;
        const btnH = 44;

        this.endlessBtn = this.add.container(180, btnY).setDepth(20);

        const isEndlessUnlocked = this.unlockedLevel > TOTAL_CAMPAIGN_LEVELS || this.totalStars >= 45;

        const bg = this.add.graphics();
        if (isEndlessUnlocked) {
            bg.fillStyle(C.BTN_AMBER, 1);
            bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 10);
            bg.fillStyle(0xffffff, 0.2);
            bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH / 2, { tl: 10, tr: 10, bl: 0, br: 0 });

            const txt = this.add.text(0, 0, '♾️ MODE ENDLESS (TANPA BATAS)', {
                fontFamily: FONT_PIXEL,
                fontSize: '9.5px',
                color: '#ffffff'
            }).setOrigin(0.5).setResolution(4);
            this.endlessBtn.add(txt);

            const hit = this.add.zone(0, 0, btnW, btnH).setInteractive({ useHandCursor: true });
            this.endlessBtn.add(hit);

            hit.on('pointerdown', () => {
                triggerHaptic(25);
                this.audio.playMilestone();
                this.cameras.main.fadeOut(180, 241, 245, 249);
                this.time.delayedCall(180, () => {
                    this.scene.start('MemoryScene', { level: 31 });
                });
            });
        } else {
            bg.fillStyle(0xe2e8f0, 1);
            bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 10);
            bg.lineStyle(1, 0xcbd5e1, 1);
            bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 10);

            const txt = this.add.text(0, 0, '🔒 ENDLESS (BUTUH 45 BINTANG)', {
                fontFamily: FONT_PIXEL,
                fontSize: '8.5px',
                color: '#64748b'
            }).setOrigin(0.5).setResolution(4);
            this.endlessBtn.add(txt);
        }

        this.endlessBtn.addAt(bg, 0);
    }
}
