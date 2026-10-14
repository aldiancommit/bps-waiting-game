import Phaser from 'phaser';
import { sessionStore } from '../SessionState.js';

/**
 * OpeningScene - Splash Screen & Initial Game Asset Loader.
 * Menampilkan opening game BPS di route awal, memastikan semua aset dan font
 * ter-load dengan baik di latar belakang, lalu bertransisi secara mulus ke HubScene.
 */
export class OpeningScene extends Phaser.Scene {
    constructor() {
        super('OpeningScene');
        this.hasTransitioned = false;
    }

    preload() {
        // Load opening splash asset (WebP optimal)
        this.load.image('opening-game-bps', 'assets/opening-game-bps.webp');

        // Preload core assets for Main Menu (HubScene)
        this.load.image('logo-bps', 'assets/logo-bps.webp');
        this.load.image('mahkota', 'assets/mahkota-icon.webp');
        this.load.image('restart-icon', 'assets/restart-icon.webp');
    }

    create() {
        const s = sessionStore.getScene();
        if (s) {
            const targetScene = (s.scene === 'MemoryScene' && typeof s.params?.level !== 'number')
                ? 'MemoryLevelSelectScene'
                : s.scene;
            this.scene.start(targetScene, s.params || {});
            return;
        }

        this.hasTransitioned = false;
        this.cameras.main.resetFX();

        const dpr = this.game.config.width / 360;
        this.cameras.main.setZoom(dpr);
        this.cameras.main.centerOn(180, 320);
        this.cameras.main.setBackgroundColor('#F1F5F9');

        if (this.textures.exists('opening-game-bps')) {
            this.textures.get('opening-game-bps').setFilter(Phaser.Textures.FilterMode.LINEAR);
        }

        // Render opening image covering full visible canvas (cover mode, no distortion)
        const logicH = this.game.config.height / dpr;
        const imgW = 720, imgH = 1280; // opening-game-bps.webp actual dimensions
        const imgAspect = imgW / imgH;
        const viewAspect = 360 / logicH;
        // Cover: fill both dimensions, crop excess
        const dispW = viewAspect > imgAspect ? 360 : logicH * imgAspect;
        const dispH = viewAspect > imgAspect ? 360 / imgAspect : logicH;
        const splash = this.add.image(180, 320, 'opening-game-bps')
            .setDisplaySize(dispW, dispH)
            .setAlpha(0);

        // Smooth fade-in tween
        this.tweens.add({
            targets: splash,
            alpha: 1,
            duration: 450,
            ease: 'Quad.easeOut'
        });

        // Tunggu hingga font dan seluruh aset siap, dengan durasi minimal opening
        const minDurationPromise = new Promise(resolve => this.time.delayedCall(1600, resolve));
        const fontReadyPromise = (document.fonts && document.fonts.ready)
            ? document.fonts.ready
            : Promise.resolve();

        // Otomatis transisi ke menu setelah semua siap dan durasi terpenuhi
        Promise.all([minDurationPromise, fontReadyPromise]).then(() => {
            this._transitionToMenu();
        }).catch(() => {
            this._transitionToMenu();
        });

        // Izinkan pemain tap layar untuk mempercepat transisi setelah jeda 600ms
        this.time.delayedCall(600, () => {
            if (!this.hasTransitioned) {
                this.input.once('pointerdown', () => {
                    this._transitionToMenu();
                });
            }
        });
    }

    _transitionToMenu() {
        if (this.hasTransitioned) return;
        this.hasTransitioned = true;

        // Smooth fade-out kamera menuju palette background menu (#F1F5F9)
        this.cameras.main.fadeOut(380, 241, 245, 249);
        this.time.delayedCall(380, () => {
            this.scene.start('HubScene');
        });
    }
}
