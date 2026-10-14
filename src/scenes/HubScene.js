/**
 * Multi-Game Hub Scene for BPS Waiting Game.
 * Exact Slicing Implementation of "Ruang Game BPS - Menu"
 * Pixel typography on Play buttons, game titles (TENTEN/BLOCKS/MEMORY/ANGKA),
 * and section header. Bold Poppins 700 for subtitles and footer.
 * Fully adaptive logical height (640-800) with zero clipping and zero contrasting bars.
 */

import Phaser from 'phaser';
import { RetroAudio, triggerHaptic } from '../shared/Audio.js';
import { ensureFontsLoaded } from '../shared/FontLoader.js';
import { setSceneThemeColor } from '../shared/Viewport.js';

/* ===== 1. KONFIGURASI ===== */
const DESIGN_W = 360;

const FONT_PIXEL = "'Public Pixel', monospace, sans-serif";
const FONT_HUB = "'Poppins', system-ui, -apple-system, sans-serif";
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

function getHubLayout(H) {
    const bannerH = 106;
    const gapBannerSection = 20;
    const sectionH = 16;
    const gapSectionCard = 14;
    const cardH = 96;
    const gapCardCard = 16;

    // Total height of the central block
    const blockH = bannerH + gapBannerSection + sectionH + gapSectionCard + cardH + gapCardCard + cardH; // 368

    // Available vertical space between header (ends ~66) and footer (starts ~H-36)
    const headerBottom = 66;
    const footerTop = H - 36;
    const availH = footerTop - headerBottom;

    // Center the block vertically
    const blockTop = Math.round(headerBottom + Math.max(16, (availH - blockH) / 2));

    const bannerY = blockTop;
    const sectionY = bannerY + bannerH + gapBannerSection;
    const card1Y = sectionY + sectionH + gapSectionCard;
    const card2Y = card1Y + cardH + gapCardCard;
    const footerY = H - 28;

    return {
        banner: { x: 16, y: bannerY, w: 328, h: bannerH, r: 24 },
        section: { y: sectionY + 12 },
        card: { x: 16, y: card1Y, w: 328, h: cardH, r: 24, pitch: cardH + gapCardCard, pad: 14 },
        card1Y,
        card2Y,
        icon: { size: 56 },
        text: { dx: 86, eyebrowDy: 28, titleDy: 50, descDy: 72 },
        button: { w: 76, h: 36 },
        footer: { y: footerY }
    };
}

/* ===== 2. CANVAS DRAWING HELPERS ===== */
function roundRectPath(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.arcTo(x + w, y, x + w, y + radius, radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
    ctx.lineTo(x + radius, y + h);
    ctx.arcTo(x, y + h, x, y + h - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
}

function fillRoundRect(ctx, x, y, w, h, r, fillStyle, shadow = null) {
    ctx.save();
    if (shadow) {
        ctx.shadowColor = shadow.color || 'rgba(0,0,0,0.1)';
        ctx.shadowBlur = shadow.blur || 8;
        ctx.shadowOffsetX = shadow.dx || 0;
        ctx.shadowOffsetY = shadow.dy || 3;
    }
    ctx.fillStyle = fillStyle;
    roundRectPath(ctx, x, y, w, h, r);
    ctx.fill();
    ctx.restore();
}

function fillCircle(ctx, cx, cy, r, fillStyle) {
    ctx.save();
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function fillPolygon(ctx, points, fillStyle) {
    if (points.length === 0) return;
    ctx.save();
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawText(ctx, text, x, y, opts = {}) {
    ctx.save();
    if (opts.font) ctx.font = opts.font;
    if (opts.color) ctx.fillStyle = opts.color;
    ctx.textAlign = opts.align || 'left';
    ctx.textBaseline = opts.baseline || 'alphabetic';

    if (opts.shadow) {
        ctx.shadowColor = opts.shadow.color || 'rgba(0,0,0,0.15)';
        ctx.shadowBlur = opts.shadow.blur || 4;
        ctx.shadowOffsetX = opts.shadow.dx || 0;
        ctx.shadowOffsetY = opts.shadow.dy || 2;
    }

    if (Array.isArray(text)) {
        let curX = x;
        text.forEach((part) => {
            ctx.save();
            if (part.font) ctx.font = part.font;
            if (part.color) ctx.fillStyle = part.color;
            ctx.fillText(part.text, curX, y);
            curX += ctx.measureText(part.text).width + (part.spacing || 0);
            ctx.restore();
        });
    } else {
        ctx.fillText(text, Math.round(x), Math.round(y));
    }
    ctx.restore();
}

function measure(ctx, text, font) {
    ctx.save();
    ctx.font = font;
    const m = ctx.measureText(text).width;
    ctx.restore();
    return m;
}

function sparkle(ctx, x, y, size, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.quadraticCurveTo(x, y, x + size, y);
    ctx.quadraticCurveTo(x, y, x, y + size);
    ctx.quadraticCurveTo(x, y, x - size, y);
    ctx.quadraticCurveTo(x, y, x, y - size);
    ctx.fill();
    ctx.restore();
}

function miniBlock(ctx, x, y, size, angle, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    roundRectPath(ctx, -size / 2, -size / 2, size, size, 2.5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
}

function drawGamepad(ctx, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.1);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    roundRectPath(ctx, -24, -13, 48, 26, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-17, -2, 10, 4);
    ctx.fillRect(-14, -5, 4, 10);
    fillCircle(ctx, 10, -3, 2.4, '#F7D96B');
    fillCircle(ctx, 16, 2, 2.4, '#4BD08B');
    fillCircle(ctx, 8, 4, 2.2, '#FF9A4A');
    fillCircle(ctx, 13, -6, 2, '#6EE7B7');
    ctx.restore();
}

const ICONS = {
    tenten(ctx) {
        ctx.save();
        ctx.fillStyle = '#E8F5FD';
        roundRectPath(ctx, 0, 0, 56, 56, 16);
        ctx.fill();
        ctx.strokeStyle = 'rgba(9,146,222,0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();

        const colors = ['#22C55E', '#0992DE', '#E77F28', '#F59E0B'];
        const coords = [
            { x: 12, y: 12, c: 0 },
            { x: 28, y: 12, c: 1 },
            { x: 12, y: 28, c: 2 },
            { x: 28, y: 28, c: 3 },
            { x: 38, y: 38, c: 1, sz: 8 }
        ];

        coords.forEach(b => {
            const sz = b.sz || 15;
            ctx.fillStyle = colors[b.c];
            roundRectPath(ctx, b.x, b.y, sz, sz, 4);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            roundRectPath(ctx, b.x + 1.5, b.y + 1.5, sz - 3, sz / 2 - 1.5, 2);
            ctx.fill();
        });
        ctx.restore();
    },

    memory(ctx) {
        ctx.save();
        ctx.fillStyle = '#FEF3E8';
        roundRectPath(ctx, 0, 0, 56, 56, 16);
        ctx.fill();
        ctx.strokeStyle = 'rgba(231,127,40,0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();

        const bubbles = [
            { x: 17, y: 17, r: 10, n: '1', c: '#E77F28' },
            { x: 38, y: 20, r: 8.5, n: '2', c: '#0992DE' },
            { x: 23, y: 39, r: 9, n: '3', c: '#22C55E' },
            { x: 42, y: 40, r: 7.5, n: '4', c: '#F59E0B' },
        ];

        bubbles.forEach(b => {
            ctx.fillStyle = b.c;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.7)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(b.x, b.y, 6.5, 0, Math.PI * 2);
            ctx.stroke();
            drawText(ctx, b.n, b.x, b.y + 3, { font: '700 9px "Poppins", sans-serif', color: COLOR.white, align: 'center' });
        });
        ctx.restore();
    },
};

/* ===== 3. RENDER GENERATORS ===== */
function drawStaticBackground(canvas, logoImage = null, dpr = 2, H = 640) {
    const ctx = canvas.getContext('2d');
    const w = DESIGN_W;
    const h = H;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.scale(dpr, dpr);

    const layout = getHubLayout(h);

    // 1. Background Gradient spanning full height H
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#EAF1FF');
    g.addColorStop(0.30, '#E1EDF8');
    g.addColorStop(0.65, '#D4E5F5');
    g.addColorStop(1, '#C7DCF1');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // 2. Atmosphere Decorations (smooth gradients, no sharp edges)
    let polyG = ctx.createLinearGradient(0, 0, 0, 110);
    polyG.addColorStop(0, 'rgba(190,236,170,0.85)');
    polyG.addColorStop(1, 'rgba(204,238,190,0.20)');
    fillPolygon(ctx, [[98, 0], [202, 0], [208, 109]], polyG);

    polyG = ctx.createLinearGradient(0, 0, 0, 92);
    polyG.addColorStop(0, 'rgba(160,210,248,0.85)');
    polyG.addColorStop(1, 'rgba(176,218,247,0.20)');
    fillPolygon(ctx, [[264, 15], [285, 0], [360, 0], [360, 88]], polyG);

    const glowG = ctx.createRadialGradient(0, 218, 0, 0, 218, 110);
    glowG.addColorStop(0, 'rgba(250,226,140,0.55)');
    glowG.addColorStop(1, 'rgba(250,226,140,0)');
    ctx.fillStyle = glowG;
    ctx.fillRect(0, 110, 120, 220);

    const sunG = ctx.createRadialGradient(284, 265, 2, 290, 272, 20);
    sunG.addColorStop(0, '#FFF0A8');
    sunG.addColorStop(1, COLOR.yellow);
    fillCircle(ctx, 290, 272, 19.5, sunG);

    sparkle(ctx, 250, 64, 4.5, 'rgba(255,255,255,0.9)');

    // 3. Header: BPS Official Asset Logo & Title (Batas aman atas >= 28px)
    const headerY = 28;
    if (logoImage) {
        ctx.drawImage(logoImage, 20, headerY, 44, 34);
    }
    drawText(ctx, 'BPS', 72, headerY + 18, { font: '700 22px "Poppins", sans-serif', color: COLOR.navy });
    drawText(ctx, 'Badan Pusat Statistik', 72, headerY + 32, { font: '700 10px "Poppins", sans-serif', color: '#2A5478', spacing: 0.4 });

    // 4. Banner (Centered vertically inside central block)
    const b = layout.banner;
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

    sparkle(ctx, b.x + 191, b.y + 24, 4.5, 'rgba(255,255,255,0.9)');
    sparkle(ctx, b.x + 248, b.y + 15, 3.2, 'rgba(255,243,176,0.95)');
    sparkle(ctx, b.x + 172, b.y + 57, 2.8, 'rgba(255,255,255,0.85)');
    miniBlock(ctx, b.x + 213, b.y + 42, 8.2, 0.4, '#F7D96B');
    miniBlock(ctx, b.x + 233, b.y + 58, 6.4, -0.3, '#4BD08B');
    miniBlock(ctx, b.x + 307, b.y + 14, 7.3, 0.5, '#FF9A4A');
    drawGamepad(ctx, b.x + 282, b.y + 42);

    const sh2 = { color: 'rgba(0,45,110,0.28)', blur: 5, dy: 2.5 };
    drawText(ctx, 'Ruang', b.x + 20, b.y + 36, { font: '700 30px "Poppins", sans-serif', color: COLOR.white, shadow: sh2 });
    drawText(ctx, [
        { text: 'Game ', color: COLOR.white, font: '700 20px "Poppins", sans-serif' },
        { text: 'BP', color: COLOR.white, font: '700 22px "Poppins", sans-serif' },
        { text: 'S', color: COLOR.yellowHighlight, font: '700 22px "Poppins", sans-serif' },
    ], b.x + 22, b.y + 58, { shadow: sh2 });
    drawText(ctx, 'Sambil menunggu panggilan data, yuk mainkan game ringan', b.x + 22, b.y + 77,
        { font: '700 9px "Poppins", sans-serif', color: 'rgba(255,255,255,0.95)' });
    drawText(ctx, 'berikut!', b.x + 22, b.y + 88, { font: '700 9px "Poppins", sans-serif', color: 'rgba(255,255,255,0.95)' });

    // 5. Section Title: "Pilih Game Favoritemu !" (Public Pixel)
    ctx.font = `10px ${FONT_PIXEL}`;
    const str1 = 'Pilih Game ', str2 = 'Favoritemu !';
    const totalW = ctx.measureText(str1 + str2).width;
    const startX = Math.round((w - totalW) / 2);

    drawText(ctx, str1, startX, layout.section.y, { font: ctx.font, color: COLOR.navy, align: 'left' });
    drawText(ctx, str2, startX + ctx.measureText(str1).width, layout.section.y, { font: ctx.font, color: '#EE7515', align: 'left' });

    // 6. Footer (Batas aman bawah >= 28px, Poppins 700)
    drawText(ctx, 'Ruang Pelayanan Badan Pusat Statistik', w / 2, layout.footer.y,
        { font: '700 9px "Poppins", sans-serif', color: '#5A7593', align: 'center', spacing: 0.4 });
}

function drawCardToCanvas(canvas, game, pressed = false, dpr = 2) {
    const ctx = canvas.getContext('2d');
    const layout = getHubLayout(640);
    const padX = 10;
    const padY = 10;
    const w = layout.card.w;
    const h = layout.card.h;
    const r = layout.card.r;

    canvas.width = Math.round((w + padX * 2) * dpr);
    canvas.height = Math.round((h + padY * 2) * dpr);
    ctx.scale(dpr, dpr);

    const cardX = padX;
    const cardY = padY;

    // 1. Soft Shadow
    if (!pressed) {
        ctx.save();
        ctx.shadowColor = 'rgba(12, 59, 92, 0.08)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;
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
    ctx.strokeStyle = 'rgba(18, 55, 105, 0.08)';
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
    ctx.translate(cardX + layout.card.pad, cardY + (h - layout.icon.size) / 2);
    ICONS[game.icon](ctx);
    ctx.restore();

    // 6. Texts (Public Pixel for Eyebrow & Title; Poppins 700 for Desc)
    const tx = cardX + layout.text.dx;
    drawText(ctx, game.eyebrow, tx, cardY + layout.text.eyebrowDy, { font: `9px ${FONT_PIXEL}`, color: COLOR.blue, spacing: 0.5 });
    drawText(ctx, game.title, tx, cardY + layout.text.titleDy, { font: `12px ${FONT_PIXEL}`, color: COLOR.navyText });
    drawText(ctx, game.desc, tx, cardY + layout.text.descDy, { font: '700 9px "Poppins", sans-serif', color: '#6E809A' });

    // 7. Button (Right side, minimal touch height 48px hit area)
    const b = {
        x: cardX + w - layout.card.pad - layout.button.w,
        y: cardY + (h - layout.button.h) / 2 - 1,
        w: layout.button.w,
        h: layout.button.h
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
    const sx = Math.round(b.x + (b.w - totalBtnW) / 2);
    const btnCy = Math.round(fy + b.h / 2);
    fillPolygon(ctx, [[sx, btnCy - 4], [sx, btnCy + 4], [sx + iconW, btnCy]], '#FFFFFF');
    drawText(ctx, 'PLAY', sx + iconW + gap, btnCy + 3, { font: f, color: COLOR.white, spacing: 0.2 });

    ctx.restore();
}

/* ===== 4. PHASER SCENE ===== */
export class HubScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HubScene' });
        this.audio = new RetroAudio();
        this.cardSprites = [];
        this.cardHitZones = [];
    }

    preload() {
        this.load.image('logo-bps', 'assets/logo-bps.webp');
    }

    async create() {
        this.cameras.main.resetFX();
        const dpr = this.game.config.width / 360;
        const H = Math.round(this.game.config.height / dpr);
        this.logicH = H;
        this.dpr = dpr;

        this.cameras.main.setZoom(dpr);
        this.cameras.main.centerOn(180, H / 2);
        this.cameras.main.setBackgroundColor('#EBF3FB');
        setSceneThemeColor('#EBF3FB', '#EAF1FF');

        if (this.textures.exists('logo-bps')) {
            this.textures.get('logo-bps').setFilter(Phaser.Textures.FilterMode.LINEAR);
        }

        await this._ensureFontsLoaded();
        this._generateTextures(dpr, H);
        this._buildStaticLayer(H);
        this._buildAudioButton();
        this._buildGameCards(H);
        this._buildToast();

        // Viewport resize listener for rotation / dynamic toolbar changes
        this.game.events.on('viewport-resize', this._onViewportResize, this);

        this.cameras.main.fadeIn(200, 234, 241, 255);
    }

    async _ensureFontsLoaded() {
        await ensureFontsLoaded(2000);
        if (typeof document !== 'undefined' && document.fonts) {
            try {
                await Promise.allSettled([
                    document.fonts.load('8px "Public Pixel"'),
                    document.fonts.load('10px "Public Pixel"'),
                    document.fonts.load('12px "Public Pixel"'),
                    document.fonts.load('700 12px "Poppins"')
                ]);
            } catch {
                // Safe fallback
            }
        }
    }

    _onViewportResize({ logicW, logicH, dpr }) {
        this.logicH = logicH;
        this.dpr = dpr;
        this.cameras.main.setZoom(dpr);
        this.cameras.main.centerOn(180, logicH / 2);
        this._generateTextures(dpr, logicH);

        if (this.staticBgImage) {
            this.staticBgImage.setTexture('hub-static-bg');
            this.staticBgImage.setPosition(180, logicH / 2);
            this.staticBgImage.setDisplaySize(360, logicH);
        }

        this._repositionGameCards(logicH);
    }

    _generateTextures(dpr = 2, H = 640) {
        // 1. Static Layer Canvas Texture with loaded official BPS logo asset
        const bgCanvas = document.createElement('canvas');
        let logoImg = null;
        if (this.textures.exists('logo-bps')) {
            logoImg = this.textures.get('logo-bps').getSourceImage();
        }
        drawStaticBackground(bgCanvas, logoImg, dpr, H);

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

    _buildStaticLayer(H = 640) {
        this.staticBgImage = this.add.image(180, H / 2, 'hub-static-bg')
            .setDisplaySize(360, H)
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

    _buildGameCards(H = 640) {
        const layout = getHubLayout(H);
        const padX = 10;
        const padY = 10;
        const spriteW = layout.card.w + padX * 2;
        const spriteH = layout.card.h + padY * 2;
        const cardHitW = layout.card.w;
        const cardHitH = layout.card.h;

        this.cardSprites = [];
        this.cardHitZones = [];

        GAMES.forEach((game, i) => {
            const cardY = i === 0 ? layout.card1Y : layout.card2Y;
            const cy = cardY + layout.card.h / 2;
            const cx = 180;

            const cardSprite = this.add.image(cx, cy, `hub-card-${game.id}-normal`)
                .setDisplaySize(spriteW, spriteH)
                .setDepth(10);
            this.cardSprites.push(cardSprite);

            // Minimum 48px hit height target
            const hitZone = this.add.zone(cx, cy, cardHitW, Math.max(48, cardHitH)).setInteractive({ useHandCursor: true }).setDepth(15);
            this.cardHitZones.push(hitZone);

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
                triggerHaptic(25);
                this._launchGame(game.id);
            });
        });
    }

    _repositionGameCards(H = 640) {
        const layout = getHubLayout(H);
        GAMES.forEach((game, i) => {
            const cardY = i === 0 ? layout.card1Y : layout.card2Y;
            const cy = cardY + layout.card.h / 2;
            if (this.cardSprites[i]) this.cardSprites[i].setPosition(180, cy);
            if (this.cardHitZones[i]) this.cardHitZones[i].setPosition(180, cy);
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

    _launchGame(gameId) {
        let targetScene = '';
        if (gameId === 'tenten') {
            targetScene = 'BlockPuzzleScene';
        } else if (gameId === 'memory-angka') {
            targetScene = 'LevelSelectScene';
        } else {
            return;
        }

        this.cameras.main.fadeOut(220, 234, 241, 255);
        this.time.delayedCall(220, () => {
            this.scene.start(targetScene);
        });
    }

    shutdown() {
        this.tweens.killAll();
        this.game.events.off('viewport-resize', this._onViewportResize, this);
    }
}
