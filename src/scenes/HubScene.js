/**
 * Multi-Game Hub Scene for BPS Waiting Game.
 * Exact Slicing Implementation of "Ruang Game BPS - Menu"
 * Pixel typography on Play buttons and game titles (BLOCKS & ANGKA)
 * Reuses official BPS logo asset with 100% offline, High-DPI crisp Canvas textures.
 */

import Phaser from 'phaser';
import { RetroAudio, triggerHaptic } from '../shared/Audio.js';

/* ===== 1. KONFIGURASI (satuan desain standar 360 x 640) ===== */
const DESIGN_W = 360;
const DESIGN_H = 640;
const ASPECT = 9 / 16;

const FONT_PIXEL = "'Public Pixel', sans-serif";
const FONT_HUB = "'Poppins', 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const fd = (w, s) => `${w} ${s}px ${FONT_HUB}`;
const fb = (w, s) => `${w} ${s}px ${FONT_HUB}`;

const COLOR = {
    bgTop: '#EAF1FF', bgBottom: '#FFFFFF',
    navy: '#0C3B5C', navyText: '#12315A', navyIcon: '#12336F',
    blue: '#0992DE', orange: '#E77F28',
    yellow: '#F7D96B', yellowHighlight: '#FFE680',
    white: '#FFFFFF', cardGlow: '#B5DDF5',
};

const GAMES = [
    { id: 'tenten',       name: 'Tenten Blocks', eyebrow: 'TENTEN', title: 'BLOCKS', desc: 'Susun balok seru',   icon: 'tenten' },
    { id: 'memory-angka', name: 'Memory Angka',  eyebrow: 'MEMORY', title: 'ANGKA',  desc: 'Ingat urutan angka', icon: 'memory' },
];

const LAYOUT = {
    banner:  { x: 16, y: 84, w: 328, h: 106, r: 24 },
    section: { y: 216 },
    card:    { x: 16, y: 236, w: 328, h: 96, r: 24, pitch: 114, pad: 14 },
    icon:    { size: 56 },
    text:    { dx: 86, eyebrowDy: 30, titleDy: 52, descDy: 70 },
    button:  { w: 90, h: 36 },
};

/* ===== 2. HELPER GAMBAR VECTOR ===== */
function roundRectPath(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function fillRoundRect(ctx, x, y, w, h, r, fill, shadow) {
    ctx.save();
    if (shadow) {
        ctx.shadowColor = shadow.color;
        ctx.shadowBlur = shadow.blur;
        ctx.shadowOffsetY = shadow.dy;
    }
    ctx.fillStyle = fill;
    roundRectPath(ctx, x, y, w, h, r);
    ctx.fill();
    ctx.restore();
}

function fillPolygon(ctx, pts, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fill();
}

function fillCircle(ctx, x, y, r, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
}

function sparkle(ctx, x, y, r, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.fill();
}

function miniBlock(ctx, x, y, s, rot, fill) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    fillRoundRect(ctx, -s / 2, -s / 2, s, s, s * 0.3, fill, { color: 'rgba(0,40,100,0.22)', blur: 4, dy: 2 });
    ctx.restore();
}

function drawText(ctx, runs, x, y, { font: f, color = '#000', spacing = 0, align = 'left', shadow } = {}) {
    const list = typeof runs === 'string' ? [{ text: runs }] : runs;
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    if (shadow) {
        ctx.shadowColor = shadow.color;
        ctx.shadowBlur = shadow.blur;
        ctx.shadowOffsetY = shadow.dy;
    }
    const width = (run) => {
        ctx.font = run.font || f;
        return spacing
            ? [...run.text].reduce((s, ch) => s + ctx.measureText(ch).width + spacing, 0)
            : ctx.measureText(run.text).width;
    };
    const total = list.reduce((s, r) => s + width(r), 0) - (spacing || 0);
    let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
    for (const run of list) {
        ctx.font = run.font || f;
        ctx.fillStyle = run.color || color;
        if (!spacing) {
            ctx.fillText(run.text, cx, y);
            cx += ctx.measureText(run.text).width;
        } else {
            for (const ch of run.text) {
                ctx.fillText(ch, cx, y);
                ctx.fillText(ch, cx, y);
                cx += ctx.measureText(ch).width + spacing;
            }
        }
    }
    ctx.restore();
}

function measure(ctx, text, f) {
    ctx.save();
    ctx.font = f;
    const w = ctx.measureText(text).width;
    ctx.restore();
    return w;
}

function drawGamepad(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.14);
    const body = ctx.createLinearGradient(0, -17, 0, 17);
    body.addColorStop(0, '#FFFFFF');
    body.addColorStop(1, '#CFE4F6');
    fillRoundRect(ctx, -26, -22, 16, 7, 3.5, 'rgba(255,255,255,0.75)');
    fillRoundRect(ctx, 10, -22, 16, 7, 3.5, 'rgba(255,255,255,0.75)');
    fillRoundRect(ctx, -33, -17, 66, 34, 17, body, { color: 'rgba(0,50,110,0.35)', blur: 9, dy: 6 });
    fillRoundRect(ctx, -25, -2.4, 12, 4.8, 2, COLOR.navyIcon);
    fillRoundRect(ctx, -21.4, -6, 4.8, 12, 2, COLOR.navyIcon);
    fillCircle(ctx, 19, -6, 3.5, '#F0731A');
    fillCircle(ctx, 25, 0, 3.5, '#1FA35B');
    fillCircle(ctx, 19, 6, 3.5, '#0992DE');
    fillCircle(ctx, 13, 0, 3.5, '#F7C948');
    fillRoundRect(ctx, -6, 0, 5, 2.6, 1.3, '#9DB4CC');
    fillRoundRect(ctx, 1, 0, 5, 2.6, 1.3, '#9DB4CC');
    ctx.restore();
}

const ICONS = {
    tenten(ctx) {
        const size = 14, pitch = 17.5, x0 = 5, y0 = 5.2, r = 5.5;
        const grid = [
            ['#12326F', '#12326F', '#F5781F'],
            ['#1A5BA3', '#2AA876', '#F5781F'],
            ['#1A5BA3', '#2AA876', null],
        ];
        grid.forEach((row, ry) => row.forEach((color, cx) => {
            if (!color) return;
            const x = x0 + cx * pitch, y = y0 + ry * pitch;
            fillRoundRect(ctx, x, y, size, size, r, color, { color: 'rgba(18,50,111,0.25)', blur: 4, dy: 2 });
            fillRoundRect(ctx, x + 1.6, y + 1.3, size - 3.2, size * 0.38, r * 0.55, 'rgba(255,255,255,0.26)');
        }));
        fillCircle(ctx, 51, 48, 5.3, '#F5781F');
        fillCircle(ctx, 49.5, 46.4, 1.6, 'rgba(255,255,255,0.55)');
    },
    memory(ctx) {
        const g = ctx.createLinearGradient(0, 0, 55, 56);
        g.addColorStop(0, '#2457B8');
        g.addColorStop(1, '#0E2A66');
        fillRoundRect(ctx, 0, 0, 55, 55, 20, g, { color: 'rgba(18,50,111,0.30)', blur: 7, dy: 3.5 });
        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.lineWidth = 1.1;
        roundRectPath(ctx, 0.5, 0.5, 54, 54, 19.5);
        ctx.stroke();
        ctx.lineCap = 'round';
        ctx.lineWidth = 4.2;
        ctx.strokeStyle = '#C3CCE0';
        ctx.beginPath();
        ctx.moveTo(20, 35);
        ctx.lineTo(29, 44);
        ctx.moveTo(34, 21);
        ctx.lineTo(43, 29);
        ctx.stroke();
        [
            { n: '1', x: 12.5, y: 41, color: '#F2701F' },
            { n: '2', x: 27.5, y: 27, color: '#27A55F' },
            { n: '3', x: 43.5, y: 13.5, color: '#F2701F' },
        ].forEach((b) => {
            fillCircle(ctx, b.x, b.y, 6.5, b.color);
            ctx.strokeStyle = 'rgba(255,255,255,0.55)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(b.x, b.y, 6.5, 0, 6.283);
            ctx.stroke();
            drawText(ctx, b.n, b.x, b.y + 3.2, { font: fd(700, 9), color: COLOR.white, align: 'center' });
        });
    },
};

/* ===== 3. RENDER GENERATORS ===== */
function drawStaticBackground(canvas, logoImage = null, dpr = 2) {
    const ctx = canvas.getContext('2d');
    const w = DESIGN_W;
    const h = DESIGN_H;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.scale(dpr, dpr);

    // 1. Background
    ctx.fillStyle = COLOR.bgBottom;
    ctx.fillRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, 0, 310);
    g.addColorStop(0, COLOR.bgTop);
    g.addColorStop(1, COLOR.bgBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, 310);

    // 2. Atmosphere Decorations
    let polyG = ctx.createLinearGradient(0, 0, 0, 110);
    polyG.addColorStop(0, 'rgba(190,236,170,0.85)');
    polyG.addColorStop(1, 'rgba(204,238,190,0.20)');
    fillPolygon(ctx, [[98, 0], [202, 0], [208, 109]], polyG);

    polyG = ctx.createLinearGradient(0, 0, 0, 92);
    polyG.addColorStop(0, 'rgba(160,210,248,0.85)');
    polyG.addColorStop(1, 'rgba(176,218,247,0.20)');
    fillPolygon(ctx, [[264, 15], [285, 0], [360, 0], [360, 88]], polyG);

    const glowG = ctx.createRadialGradient(0, 218, 0, 0, 218, 100);
    glowG.addColorStop(0, 'rgba(250,226,140,0.55)');
    glowG.addColorStop(1, 'rgba(250,226,140,0)');
    ctx.fillStyle = glowG;
    ctx.fillRect(0, 110, 110, 220);

    const sunG = ctx.createRadialGradient(284, 265, 2, 290, 272, 20);
    sunG.addColorStop(0, '#FFF0A8');
    sunG.addColorStop(1, COLOR.yellow);
    fillCircle(ctx, 290, 272, 19.5, sunG);

    sparkle(ctx, 250, 64, 4.5, 'rgba(255,255,255,0.9)');

    // 3. Header: BPS Official Asset Logo & Title (Batas aman atas >= 28px)
    if (logoImage) {
        ctx.drawImage(logoImage, 20, 28, 44, 34);
    }
    drawText(ctx, 'BPS', 72, 46, { font: fd(700, 22), color: COLOR.navy });
    drawText(ctx, 'Badan Pusat Statistik', 72, 60, { font: fb(600, 10), color: '#2A5478', spacing: 0.4 });

    // 4. Banner
    const b = LAYOUT.banner;
    const bgG = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
    bgG.addColorStop(0, '#2CB9F7');
    bgG.addColorStop(0.55, '#0992DE');
    bgG.addColorStop(1, '#066CBD');
    fillRoundRect(ctx, b.x, b.y, b.w, b.h, b.r, bgG, { color: 'rgba(6,100,185,0.22)', blur: 12, dy: 5 });

    ctx.save();
    roundRectPath(ctx, b.x, b.y, b.w, b.h, b.r);
    ctx.clip();
    fillCircle(ctx, b.x + b.w - 7, b.y - 11, 66, 'rgba(255,255,255,0.10)');
    fillCircle(ctx, b.x + b.w - 48, b.y + b.h + 15, 53, 'rgba(255,255,255,0.08)');
    fillCircle(ctx, b.x - 5, b.y + b.h - 4, 38, 'rgba(255,255,255,0.07)');
    const sh = ctx.createLinearGradient(0, b.y, 0, b.y + 48);
    sh.addColorStop(0, 'rgba(255,255,255,0.22)');
    sh.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sh;
    ctx.fillRect(b.x, b.y, b.w, 48);
    ctx.restore();

    ctx.strokeStyle = 'rgba(255,255,255,0.36)';
    ctx.lineWidth = 1.1;
    roundRectPath(ctx, b.x + 0.5, b.y + 0.5, b.w - 1.1, b.h - 1.1, b.r - 0.5);
    ctx.stroke();

    sparkle(ctx, 207, 108, 4.5, 'rgba(255,255,255,0.9)');
    sparkle(ctx, 264, 99, 3.2, 'rgba(255,243,176,0.95)');
    sparkle(ctx, 188, 141, 2.8, 'rgba(255,255,255,0.85)');
    miniBlock(ctx, 229, 126, 8.2, 0.4, '#F7D96B');
    miniBlock(ctx, 249, 142, 6.4, -0.3, '#4BD08B');
    miniBlock(ctx, 323, 98, 7.3, 0.5, '#FF9A4A');
    drawGamepad(ctx, 298, 126);

    const sh2 = { color: 'rgba(0,45,110,0.28)', blur: 5, dy: 2.5 };
    drawText(ctx, 'Ruang', 36, 120, { font: fd(700, 31), color: COLOR.white, shadow: sh2 });
    drawText(ctx, [
        { text: 'Game ', color: COLOR.white, font: fd(600, 20) },
        { text: 'BP', color: COLOR.white, font: fd(700, 22.5) },
        { text: 'S', color: COLOR.yellowHighlight, font: fd(700, 22.5) },
    ], 38, 142, { shadow: sh2 });
    drawText(ctx, 'Sambil menunggu panggilan data, yuk mainkan game ringan', 38, 161,
        { font: fb(600, 8.4), color: 'rgba(255,255,255,0.95)' });
    drawText(ctx, 'berikut!', 38, 172, { font: fb(600, 8.4), color: 'rgba(255,255,255,0.95)' });

    // 5. Section Title
    ctx.font = fd(700, 18);
    const str1 = 'Pilih Game ', str2 = 'Favoritemu !';
    const startX = (w - ctx.measureText(str1 + str2).width) / 2;

    drawText(ctx, str1, startX, LAYOUT.section.y, { font: ctx.font, color: COLOR.navy, align: 'left' });
    drawText(ctx, str2, startX + ctx.measureText(str1).width, LAYOUT.section.y, { font: ctx.font, color: '#EE7515', align: 'left' });

    // 6. Footer (Batas aman bawah >= 28px)
    drawText(ctx, 'Ruang Pelayanan Badan Pusat Statistik', w / 2, h - 28,
        { font: fb(600, 8.5), color: '#9FB0C6', align: 'center', spacing: 0.4 });
}

function drawCardToCanvas(canvas, game, pressed = false, dpr = 2) {
    const ctx = canvas.getContext('2d');
    const w = LAYOUT.card.w;
    const h = LAYOUT.card.h;
    const r = LAYOUT.card.r;
    const padX = 10;
    const padY = 10;
    const totalW = w + padX * 2;
    const totalH = h + padY * 2;

    canvas.width = Math.round(totalW * dpr);
    canvas.height = Math.round(totalH * dpr);
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, totalW, totalH);

    const cx = padX + w / 2;
    const cy = padY + h / 2;

    ctx.save();
    if (pressed) {
        ctx.translate(cx, cy);
        ctx.scale(0.985, 0.985);
        ctx.translate(-cx, -cy);
    }

    const cardX = padX;
    const cardY = padY + (pressed ? 1.5 : 0);

    // 1. Soft drop shadow
    if (!pressed) {
        ctx.save();
        ctx.shadowColor = 'rgba(15, 38, 70, 0.045)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = '#FFFFFF';
        roundRectPath(ctx, cardX, cardY, w, h, r);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.shadowColor = 'rgba(15, 38, 70, 0.055)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 2;
        ctx.fillStyle = '#FFFFFF';
        roundRectPath(ctx, cardX, cardY, w, h, r);
        ctx.fill();
        ctx.restore();
    } else {
        ctx.save();
        ctx.shadowColor = 'rgba(15, 38, 70, 0.04)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetY = 1;
        ctx.fillStyle = '#FFFFFF';
        roundRectPath(ctx, cardX, cardY, w, h, r);
        ctx.fill();
        ctx.restore();
    }

    // 2. Card Background Fill
    ctx.fillStyle = '#FFFFFF';
    roundRectPath(ctx, cardX, cardY, w, h, r);
    ctx.fill();

    // 3. Subtle Clean Card Border
    ctx.strokeStyle = 'rgba(18, 55, 105, 0.07)';
    ctx.lineWidth = 1;
    roundRectPath(ctx, cardX + 0.5, cardY + 0.5, w - 1, h - 1, r - 0.5);
    ctx.stroke();

    // 4. Subtle Soft Cyan Glow on Left
    ctx.save();
    roundRectPath(ctx, cardX, cardY, w, h, r);
    ctx.clip();
    const glow = ctx.createLinearGradient(cardX, cardY, cardX + 88, cardY + 22);
    glow.addColorStop(0, 'rgba(181, 221, 245, 0.55)');
    glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cardX, cardY, 120, h);
    ctx.restore();

    // 5. Icon (Vertically centered)
    ctx.save();
    ctx.translate(cardX + LAYOUT.card.pad, cardY + (h - LAYOUT.icon.size) / 2);
    ICONS[game.icon](ctx);
    ctx.restore();

    // 6. Texts (3 lines: Eyebrow + PIXEL Title + Desc)
    const tx = cardX + LAYOUT.text.dx;
    drawText(ctx, game.eyebrow, tx, cardY + LAYOUT.text.eyebrowDy, { font: fb(700, 9), color: COLOR.blue, spacing: 1.2 });
    drawText(ctx, game.title, tx, cardY + LAYOUT.text.titleDy, { font: `11.5px ${FONT_PIXEL}`, color: COLOR.navyText });
    drawText(ctx, game.desc, tx, cardY + LAYOUT.text.descDy, { font: fb(600, 8.5), color: '#6E809A' });

    // 7. Button (Right side, minimal touch height 48px hit area)
    const b = {
        x: cardX + w - LAYOUT.card.pad - LAYOUT.button.w,
        y: cardY + (h - LAYOUT.button.h) / 2 - 1,
        w: LAYOUT.button.w,
        h: LAYOUT.button.h
    };
    const fy = b.y + (pressed ? 2 : 0);
    fillRoundRect(ctx, b.x, b.y + 2.5, b.w, b.h, b.h / 2, '#B5520C');
    const bg = ctx.createLinearGradient(0, fy, 0, fy + b.h);
    bg.addColorStop(0, '#FFA94F');
    bg.addColorStop(1, '#EE7515');
    fillRoundRect(ctx, b.x, fy, b.w, b.h, b.h / 2, bg);
    ctx.save();
    roundRectPath(ctx, b.x, fy, b.w, b.h, b.h / 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    ctx.fillRect(b.x, fy, b.w, b.h * 0.48);
    ctx.restore();

    // Pixel PLAY Text & Triangle Icon
    const f = `8px ${FONT_PIXEL}`;
    const tw = measure(ctx, 'PLAY', f);
    const iconW = 6.5;
    const gap = 5.5;
    const totalBtnW = iconW + gap + tw;
    const sx = b.x + (b.w - totalBtnW) / 2;
    const btnCy = fy + b.h / 2;
    fillPolygon(ctx, [[sx, btnCy - 4], [sx, btnCy + 4], [sx + iconW, btnCy]], '#FFFFFF');
    drawText(ctx, 'PLAY', sx + iconW + gap, btnCy + 3, { font: f, color: COLOR.white, spacing: 0.3 });

    ctx.restore();
}

/* ===== 4. PHASER SCENE ===== */
export class HubScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HubScene' });
        this.audio = new RetroAudio();
    }

    preload() {
        this.load.image('logo-bps', 'assets/logo-bps.webp');
    }

    async create() {
        this.cameras.main.resetFX();
        const dpr = this.game.config.width / 360;
        this.cameras.main.setZoom(dpr);
        this.cameras.main.centerOn(180, 320);

        if (this.textures.exists('logo-bps')) {
            this.textures.get('logo-bps').setFilter(Phaser.Textures.FilterMode.LINEAR);
        }

        await this._ensureFontsLoaded();
        this._generateTextures(dpr);
        this._buildStaticLayer();
        this._buildAudioButton();
        this._buildGameCards();
        this._buildToast();

        // Smooth fade-in
        this.cameras.main.fadeIn(200, 234, 241, 255);
    }

    async _ensureFontsLoaded() {
        if (typeof document === 'undefined' || !document.fonts) return;
        const fontChecks = [
            document.fonts.load('400 12px "Poppins"'),
            document.fonts.load('700 12px "Poppins"'),
            document.fonts.load('400 12px "Inter"'),
            document.fonts.load('700 12px "Inter"')
        ];
        const timeout = new Promise(resolve => setTimeout(resolve, 1200));
        await Promise.race([Promise.allSettled(fontChecks), timeout]);
    }

    _generateTextures(dpr = 2) {
        // 1. Static Layer Canvas Texture with loaded official BPS logo asset
        const bgCanvas = document.createElement('canvas');
        let logoImg = null;
        if (this.textures.exists('logo-bps')) {
            logoImg = this.textures.get('logo-bps').getSourceImage();
        }
        drawStaticBackground(bgCanvas, logoImg, dpr);

        if (this.textures.exists('hub-static-bg')) {
            this.textures.remove('hub-static-bg');
        }
        this.textures.addCanvas('hub-static-bg', bgCanvas);

        // 2. Cards Textures (Normal & Pressed)
        GAMES.forEach((game) => {
            const normalCanvas = document.createElement('canvas');
            drawCardToCanvas(normalCanvas, game, false, dpr);
            const pressedCanvas = document.createElement('canvas');
            drawCardToCanvas(pressedCanvas, game, true, dpr);

            const keyNormal = `hub-card-${game.id}-normal`;
            const keyPressed = `hub-card-${game.id}-pressed`;

            if (this.textures.exists(keyNormal)) this.textures.remove(keyNormal);
            if (this.textures.exists(keyPressed)) this.textures.remove(keyPressed);

            this.textures.addCanvas(keyNormal, normalCanvas);
            this.textures.addCanvas(keyPressed, pressedCanvas);
        });
    }

    _buildStaticLayer() {
        this.staticBgImage = this.add.image(180, 320, 'hub-static-bg')
            .setDisplaySize(360, 640)
            .setDepth(1);
    }

    _buildAudioButton() {
        const topY = 42;
        this.audioBtn = this.add.container(326, topY).setDepth(25);

        const audioBg = this.add.graphics();
        audioBg.fillStyle(0xffffff, 0.92);
        audioBg.fillRoundedRect(-14, -14, 28, 28, 8);
        audioBg.lineStyle(1, 0xCBD5E1, 0.8);
        audioBg.strokeRoundedRect(-14, -14, 28, 28, 8);
        this.audioBtn.add(audioBg);

        this.audioIconG = this.add.graphics();
        this.audioBtn.add(this.audioIconG);
        this._drawAudioIcon();

        // 48x48 hit zone for accessibility
        const audioHit = this.add.zone(0, 0, 48, 48).setInteractive({ useHandCursor: true });
        this.audioBtn.add(audioHit);
        audioHit.on('pointerdown', () => {
            this.audio.toggleMute();
            this._drawAudioIcon();
            triggerHaptic(15);
        });
    }

    _drawAudioIcon() {
        if (!this.audioIconG) return;
        this.audioIconG.clear();
        const isMuted = this.audio.getIsMuted();
        const color = isMuted ? 0x94A3B8 : 0x0C3B5C;
        this.audioIconG.fillStyle(color, 1);

        this.audioIconG.fillRect(-5, -2.5, 2.5, 5);
        this.audioIconG.fillTriangle(-2.5, -2.5, -2.5, 2.5, 1.5, 5);
        this.audioIconG.fillTriangle(-2.5, -2.5, 1.5, 5, 1.5, -5);

        if (isMuted) {
            this.audioIconG.lineStyle(1.8, 0xef4444, 1);
            this.audioIconG.lineBetween(-6, 6, 6, -6);
        } else {
            this.audioIconG.lineStyle(1.4, 0x0992DE, 1);
            this.audioIconG.beginPath();
            this.audioIconG.arc(1, 0, 3.5, -Math.PI / 3, Math.PI / 3, false);
            this.audioIconG.strokePath();
            this.audioIconG.beginPath();
            this.audioIconG.arc(1, 0, 6, -Math.PI / 3, Math.PI / 3, false);
            this.audioIconG.strokePath();
        }
    }

    _buildGameCards() {
        const padX = 10;
        const padY = 10;
        const spriteW = LAYOUT.card.w + padX * 2;
        const spriteH = LAYOUT.card.h + padY * 2;
        const cardHitW = LAYOUT.card.w;
        const cardHitH = LAYOUT.card.h;

        GAMES.forEach((game, i) => {
            const cardY = LAYOUT.card.y + i * LAYOUT.card.pitch;
            const cy = cardY + LAYOUT.card.h / 2;
            const cx = 180;

            const cardSprite = this.add.image(cx, cy, `hub-card-${game.id}-normal`)
                .setDisplaySize(spriteW, spriteH)
                .setDepth(10);

            // Minimum 48px hit height target
            const hitZone = this.add.zone(cx, cy, cardHitW, Math.max(48, cardHitH)).setInteractive({ useHandCursor: true }).setDepth(15);

            hitZone.on('pointerdown', () => {
                cardSprite.setTexture(`hub-card-${game.id}-pressed`);
                triggerHaptic(20);
                this.audio.playPickup();
            });

            hitZone.on('pointerout', () => {
                cardSprite.setTexture(`hub-card-${game.id}-normal`);
            });

            hitZone.on('pointerup', () => {
                cardSprite.setTexture(`hub-card-${game.id}-normal`);
                this._onSelectGame(game.id, game.name);
            });
        });
    }

    _buildToast() {
        this.toastContainer = this.add.container(180, 520).setDepth(50).setVisible(false);
        this.toastBg = this.add.graphics();
        this.toastContainer.add(this.toastBg);

        this.toastText = this.add.text(0, 0, '', {
            fontFamily: FONT_HUB,
            fontSize: '10px',
            fontStyle: '700',
            color: '#FFFFFF'
        }).setOrigin(0.5).setResolution(3);
        this.toastContainer.add(this.toastText);
    }

    _showToast(message) {
        this.toastText.setText(message);
        const w = this.toastText.width + 36;
        const h = 28;

        this.toastBg.clear();
        this.toastBg.fillStyle(0x0C3B5C, 0.94);
        this.toastBg.fillRoundedRect(-w / 2, -h / 2, w, h, 14);

        this.toastContainer.setVisible(true).setAlpha(0).setScale(0.9);
        this.tweens.add({
            targets: this.toastContainer,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 180,
            ease: 'Back.easeOut'
        });
    }

    _onSelectGame(id, name) {
        this._showToast(`Membuka ${name}...`);

        this.time.delayedCall(160, () => {
            this.cameras.main.fadeOut(180, 234, 241, 255);
            this.time.delayedCall(180, () => {
                if (id === 'tenten') {
                    this.scene.start('BlockPuzzleScene');
                } else if (id === 'memory-angka') {
                    this.scene.start('MemoryLevelSelectScene');
                }
            });
        });
    }

    shutdown() {
        this.tweens.killAll();
    }
}
