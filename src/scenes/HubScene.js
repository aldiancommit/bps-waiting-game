/**
 * Multi-Game Hub Scene for BPS Waiting Game.
 * Exact Slicing Implementation of "Ruang Game BPS - Menu"
 * Pixel typography on Play buttons and game titles (BLOCKS & ANGKA)
 * Reuses official BPS logo asset with 100% offline, High-DPI crisp Canvas textures.
 */

import Phaser from 'phaser';
import { RetroAudio, triggerHaptic } from '../shared/Audio.js';

/* ===== 1. KONFIGURASI (satuan desain, lebar 391) ===== */
const DESIGN_W = 391;
const DESIGN_H = 695.11; // 391 / (9/16)
const ASPECT = 9 / 16;

const FONT_PIXEL = "'Public Pixel', sans-serif";
const DISPLAY = "'Fredoka','Baloo 2','Nunito',ui-rounded,system-ui,sans-serif";
const BODY = "'Nunito','Fredoka',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
const fd = (w, s) => `${w} ${s}px ${DISPLAY}`;
const fb = (w, s) => `${w} ${s}px ${BODY}`;

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
    banner:  { x: 14, y: 144, w: 360, h: 110, r: 30 },
    section: { y: 316 },
    card:    { x: 14, y: 356, w: 360, h: 96, r: 28, pitch: 126, pad: 18 },
    icon:    { size: 62 },
    text:    { dx: 98, eyebrowDy: 31, titleDy: 52, descDy: 70 },
    button:  { w: 96, h: 34 },
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
        const size = 15.5, pitch = 19.4, x0 = 5.5, y0 = 5.7, r = 6;
        const grid = [
            ['#12326F', '#12326F', '#F5781F'],
            ['#1A5BA3', '#2AA876', '#F5781F'],
            ['#1A5BA3', '#2AA876', null],
        ];
        grid.forEach((row, ry) => row.forEach((color, cx) => {
            if (!color) return;
            const x = x0 + cx * pitch, y = y0 + ry * pitch;
            fillRoundRect(ctx, x, y, size, size, r, color, { color: 'rgba(18,50,111,0.25)', blur: 4, dy: 2 });
            fillRoundRect(ctx, x + 1.8, y + 1.5, size - 3.6, size * 0.38, r * 0.55, 'rgba(255,255,255,0.26)');
        }));
        fillCircle(ctx, 56.7, 53.7, 5.9, '#F5781F');
        fillCircle(ctx, 55, 51.9, 1.8, 'rgba(255,255,255,0.55)');
    },
    memory(ctx) {
        const g = ctx.createLinearGradient(0, 0, 61, 62);
        g.addColorStop(0, '#2457B8');
        g.addColorStop(1, '#0E2A66');
        fillRoundRect(ctx, 0, 0, 61.3, 61.7, 22, g, { color: 'rgba(18,50,111,0.30)', blur: 8, dy: 4 });
        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.lineWidth = 1.2;
        roundRectPath(ctx, 0.6, 0.6, 60.1, 60.5, 21.4);
        ctx.stroke();
        ctx.lineCap = 'round';
        ctx.lineWidth = 4.6;
        ctx.strokeStyle = '#C3CCE0';
        ctx.beginPath();
        ctx.moveTo(22.2, 39);
        ctx.lineTo(32.2, 49);
        ctx.moveTo(38, 23.2);
        ctx.lineTo(48.3, 32);
        ctx.stroke();
        [
            { n: '1', x: 13.8, y: 46, color: '#F2701F' },
            { n: '2', x: 30.8, y: 30.3, color: '#27A55F' },
            { n: '3', x: 48.3, y: 15.2, color: '#F2701F' },
        ].forEach((b) => {
            fillCircle(ctx, b.x, b.y, 7.2, b.color);
            ctx.strokeStyle = 'rgba(255,255,255,0.55)';
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.arc(b.x, b.y, 7.2, 0, 6.283);
            ctx.stroke();
            drawText(ctx, b.n, b.x, b.y + 3.6, { font: fd(700, 10), color: COLOR.white, align: 'center' });
        });
    },
};

/* ===== 3. RENDER GENERATORS ===== */
function drawStaticBackground(canvas, logoImage = null) {
    const ctx = canvas.getContext('2d');
    const w = DESIGN_W;
    const h = DESIGN_H;
    canvas.width = w * 2;
    canvas.height = h * 2;
    ctx.scale(2, 2);

    // 1. Background
    ctx.fillStyle = COLOR.bgBottom;
    ctx.fillRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, 0, 340);
    g.addColorStop(0, COLOR.bgTop);
    g.addColorStop(1, COLOR.bgBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, 340);

    // 2. Atmosphere Decorations
    let polyG = ctx.createLinearGradient(0, 0, 0, 120);
    polyG.addColorStop(0, 'rgba(190,236,170,0.9)');
    polyG.addColorStop(1, 'rgba(204,238,190,0.25)');
    fillPolygon(ctx, [[107, 0], [219, 0], [226, 119]], polyG);

    polyG = ctx.createLinearGradient(0, 0, 0, 100);
    polyG.addColorStop(0, 'rgba(160,210,248,0.9)');
    polyG.addColorStop(1, 'rgba(176,218,247,0.25)');
    fillPolygon(ctx, [[287, 16], [310, 0], [391, 0], [391, 96]], polyG);

    const glowG = ctx.createRadialGradient(0, 238, 0, 0, 238, 110);
    glowG.addColorStop(0, 'rgba(250,226,140,0.6)');
    glowG.addColorStop(1, 'rgba(250,226,140,0)');
    ctx.fillStyle = glowG;
    ctx.fillRect(0, 120, 120, 240);

    const sunG = ctx.createRadialGradient(309, 289, 2, 315.5, 296, 22);
    sunG.addColorStop(0, '#FFF0A8');
    sunG.addColorStop(1, COLOR.yellow);
    fillCircle(ctx, 315.5, 296, 21.5, sunG);

    sparkle(ctx, 272, 70, 5, 'rgba(255,255,255,0.9)');

    // 3. Header: BPS Official Asset Logo & Title
    if (logoImage) {
        ctx.drawImage(logoImage, 28, 22, 46, 36);
    }
    drawText(ctx, 'BPS', 84, 41, { font: fd(700, 24), color: COLOR.navy });
    drawText(ctx, 'Badan Pusat Statistik', 84, 55, { font: fb(700, 10.5), color: '#2A5478', spacing: 0.5 });

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
    fillCircle(ctx, b.x + b.w - 8, b.y - 12, 72, 'rgba(255,255,255,0.10)');
    fillCircle(ctx, b.x + b.w - 52, b.y + b.h + 16, 58, 'rgba(255,255,255,0.08)');
    fillCircle(ctx, b.x - 6, b.y + b.h - 4, 42, 'rgba(255,255,255,0.07)');
    const sh = ctx.createLinearGradient(0, b.y, 0, b.y + 52);
    sh.addColorStop(0, 'rgba(255,255,255,0.22)');
    sh.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sh;
    ctx.fillRect(b.x, b.y, b.w, 52);
    ctx.restore();

    ctx.strokeStyle = 'rgba(255,255,255,0.36)';
    ctx.lineWidth = 1.2;
    roundRectPath(ctx, b.x + 0.6, b.y + 0.6, b.w - 1.2, b.h - 1.2, b.r - 0.6);
    ctx.stroke();

    sparkle(ctx, 226, 170, 5, 'rgba(255,255,255,0.9)');
    sparkle(ctx, 288, 160, 3.5, 'rgba(255,243,176,0.95)');
    sparkle(ctx, 205, 206, 3, 'rgba(255,255,255,0.85)');
    miniBlock(ctx, 250, 190, 9, 0.4, '#F7D96B');
    miniBlock(ctx, 272, 208, 7, -0.3, '#4BD08B');
    miniBlock(ctx, 352, 160, 8, 0.5, '#FF9A4A');
    drawGamepad(ctx, 326, 191);

    const sh2 = { color: 'rgba(0,45,110,0.28)', blur: 5, dy: 2.5 };
    drawText(ctx, 'Ruang', 45, 184, { font: fd(700, 35), color: COLOR.white, shadow: sh2 });
    drawText(ctx, [
        { text: 'Game ', color: COLOR.white, font: fd(600, 22) },
        { text: 'BP', color: COLOR.white, font: fd(700, 25) },
        { text: 'S', color: COLOR.yellowHighlight, font: fd(700, 25) },
    ], 48, 209, { shadow: sh2 });
    drawText(ctx, 'Sambil menunggu panggilan data, yuk mainkan game ringan', 48, 229.5,
        { font: fb(800, 9), color: 'rgba(255,255,255,0.95)' });
    drawText(ctx, 'berikut!', 48, 241, { font: fb(800, 9), color: 'rgba(255,255,255,0.95)' });

    // 5. Section Title
    ctx.font = fd(700, 20);
    const str1 = 'Pilih Game ', str2 = 'Favoritemu !';
    const startX = (DESIGN_W - ctx.measureText(str1 + str2).width) / 2;

    drawText(ctx, str1, startX, LAYOUT.section.y, { font: ctx.font, color: COLOR.navy, align: 'left' });
    drawText(ctx, str2, startX + ctx.measureText(str1).width, LAYOUT.section.y, { font: ctx.font, color: '#EE7515', align: 'left' });

    // 6. Footer
    drawText(ctx, 'Ruang Pelayanan Badan Pusat Statistik', DESIGN_W / 2, h - 18,
        { font: fb(700, 8.6), color: '#9FB0C6', align: 'center', spacing: 0.4 });
}

function drawCardToCanvas(canvas, game, pressed = false) {
    const ctx = canvas.getContext('2d');
    const w = LAYOUT.card.w;
    const h = LAYOUT.card.h;
    const r = LAYOUT.card.r;
    const padX = 12;
    const padY = 12;
    const totalW = w + padX * 2;
    const totalH = h + padY * 2;

    canvas.width = totalW * 2;
    canvas.height = totalH * 2;
    ctx.scale(2, 2);

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

    // 1. Soft, elegant drop shadow (Dual-pass blur with ample canvas padding)
    if (!pressed) {
        // Pass 1: Diffuse ambient soft shadow
        ctx.save();
        ctx.shadowColor = 'rgba(15, 38, 70, 0.045)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 5;
        ctx.fillStyle = '#FFFFFF';
        roundRectPath(ctx, cardX, cardY, w, h, r);
        ctx.fill();
        ctx.restore();

        // Pass 2: Direct contact soft shadow
        ctx.save();
        ctx.shadowColor = 'rgba(15, 38, 70, 0.055)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetY = 2;
        ctx.fillStyle = '#FFFFFF';
        roundRectPath(ctx, cardX, cardY, w, h, r);
        ctx.fill();
        ctx.restore();
    } else {
        // Pressed subtle contact shadow
        ctx.save();
        ctx.shadowColor = 'rgba(15, 38, 70, 0.04)';
        ctx.shadowBlur = 4;
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
    const glow = ctx.createLinearGradient(cardX, cardY, cardX + 96, cardY + 24);
    glow.addColorStop(0, 'rgba(181, 221, 245, 0.55)');
    glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cardX, cardY, 130, h);
    ctx.restore();

    // 5. Icon (Vertically centered)
    ctx.save();
    ctx.translate(cardX + LAYOUT.card.pad, cardY + (h - LAYOUT.icon.size) / 2);
    ICONS[game.icon](ctx);
    ctx.restore();

    // 6. Texts (3 lines: Eyebrow + PIXEL Title + Desc)
    const tx = cardX + LAYOUT.text.dx;
    drawText(ctx, game.eyebrow, tx, cardY + LAYOUT.text.eyebrowDy, { font: fb(800, 9.6), color: COLOR.blue, spacing: 1.4 });
    drawText(ctx, game.title, tx, cardY + LAYOUT.text.titleDy, { font: `12.5px ${FONT_PIXEL}`, color: COLOR.navyText });
    drawText(ctx, game.desc, tx, cardY + LAYOUT.text.descDy, { font: fb(700, 9), color: '#6E809A' });

    // 7. Button (Right side)
    const b = {
        x: cardX + w - LAYOUT.card.pad - LAYOUT.button.w,
        y: cardY + (h - LAYOUT.button.h) / 2 - 1.5,
        w: LAYOUT.button.w,
        h: LAYOUT.button.h
    };
    const fy = b.y + (pressed ? 2.5 : 0);
    fillRoundRect(ctx, b.x, b.y + 3, b.w, b.h, b.h / 2, '#B5520C');
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
    const f = `8.5px ${FONT_PIXEL}`;
    const tw = measure(ctx, 'PLAY', f);
    const iconW = 7;
    const gap = 6;
    const totalBtnW = iconW + gap + tw;
    const sx = b.x + (b.w - totalBtnW) / 2;
    const btnCy = fy + b.h / 2;
    fillPolygon(ctx, [[sx, btnCy - 4.5], [sx, btnCy + 4.5], [sx + iconW, btnCy]], '#FFFFFF');
    drawText(ctx, 'PLAY', sx + iconW + gap, btnCy + 3.2, { font: f, color: COLOR.white, spacing: 0.4 });

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
        this.load.image('mahkota', 'assets/mahkota-icon.webp');
        this.load.image('restart-icon', 'assets/restart-icon.webp');
    }

    create() {
        this.cameras.main.resetFX();
        const dpr = this.game.config.width / 360;
        this.cameras.main.setZoom(dpr);
        this.cameras.main.centerOn(180, 320);

        if (this.textures.exists('logo-bps')) {
            this.textures.get('logo-bps').setFilter(Phaser.Textures.FilterMode.LINEAR);
        }

        this._generateTextures();
        this._buildStaticLayer();
        this._buildAudioButton();
        this._buildGameCards();
        this._buildToast();

        // Smooth fade-in
        this.cameras.main.fadeIn(200, 234, 241, 255);
    }

    _generateTextures() {
        const H = this.cameras.main.height || 640;
        if (this.textures.exists('hub-static-bg') && HubScene._lastBakedH === H) {
            return;
        }
        HubScene._lastBakedH = H;

        // 1. Static Layer Canvas Texture with loaded official BPS logo asset
        const bgCanvas = document.createElement('canvas');
        let logoImg = null;
        if (this.textures.exists('logo-bps')) {
            logoImg = this.textures.get('logo-bps').getSourceImage();
        }
        drawStaticBackground(bgCanvas, logoImg);

        if (this.textures.exists('hub-static-bg')) {
            this.textures.remove('hub-static-bg');
        }
        this.textures.addCanvas('hub-static-bg', bgCanvas);

        // 2. Cards Textures (Normal & Pressed)
        GAMES.forEach((game) => {
            const normalCanvas = document.createElement('canvas');
            drawCardToCanvas(normalCanvas, game, false);
            const pressedCanvas = document.createElement('canvas');
            drawCardToCanvas(pressedCanvas, game, true);

            const keyNormal = `hub-card-${game.id}-normal`;
            const keyPressed = `hub-card-${game.id}-pressed`;

            if (this.textures.exists(keyNormal)) this.textures.remove(keyNormal);
            if (this.textures.exists(keyPressed)) this.textures.remove(keyPressed);

            this.textures.addCanvas(keyNormal, normalCanvas);
            this.textures.addCanvas(keyPressed, pressedCanvas);
        });
    }

    _buildStaticLayer() {
        // Edge-fill for tall screens (logicH > 640): extend gradient edges
        // Top edge: #EAF1FF (bgTop), Bottom edge: #FFFFFF (bgBottom)
        this.add.rectangle(180, -200, 400, 400, 0xEAF1FF).setDepth(0);
        this.add.rectangle(180, 840, 400, 400, 0xFFFFFF).setDepth(0);

        this.staticBgImage = this.add.image(180, 320, 'hub-static-bg')
            .setDisplaySize(360, 640)
            .setDepth(1);
    }

    _buildAudioButton() {
        // Minimalist audio toggle matching header style
        const topY = 24;
        this.audioBtn = this.add.container(334, topY - (-10)).setDepth(25);

        const audioBg = this.add.graphics();
        audioBg.fillStyle(0xffffff, 0.92);
        audioBg.fillRoundedRect(-14, -14, 28, 28, 8);
        audioBg.lineStyle(1, 0xCBD5E1, 0.8);
        audioBg.strokeRoundedRect(-14, -14, 28, 28, 8);
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
        const scaleX = 360 / DESIGN_W;
        const scaleY = 640 / DESIGN_H;

        const padX = 12;
        const padY = 12;

        const spriteW = (LAYOUT.card.w + padX * 2) * scaleX;
        const spriteH = (LAYOUT.card.h + padY * 2) * scaleY;
        const cardHitW = LAYOUT.card.w * scaleX;
        const cardHitH = LAYOUT.card.h * scaleY;

        GAMES.forEach((game, i) => {
            const cardDesignY = LAYOUT.card.y + i * LAYOUT.card.pitch;
            const cy = (cardDesignY + LAYOUT.card.h / 2) * scaleY;
            const cx = 180;

            const cardSprite = this.add.image(cx, cy, `hub-card-${game.id}-normal`)
                .setDisplaySize(spriteW, spriteH)
                .setDepth(10);

            const hitZone = this.add.zone(cx, cy, cardHitW, cardHitH).setInteractive({ useHandCursor: true }).setDepth(15);

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
        this.toastContainer = this.add.container(180, 560).setDepth(50).setVisible(false);
        this.toastBg = this.add.graphics();
        this.toastContainer.add(this.toastBg);

        this.toastText = this.add.text(0, 0, '', {
            fontFamily: BODY,
            fontSize: '10px',
            fontStyle: '800',
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
}
