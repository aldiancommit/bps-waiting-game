import Phaser from 'phaser';
import { BlockPuzzleScene } from './scenes/BlockPuzzleScene.js';

/**
 * BPS Waiting Game - Main Entry Point
 * Pixel Art Theme
 */

const DPR = Math.min(window.devicePixelRatio || 1, 3);

const config = {
    type: Phaser.AUTO,
    width: 360 * DPR,
    height: 640 * DPR,
    parent: document.body,
    backgroundColor: '#F1F5F9',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    render: {
        antialias: true,
        pixelArt: false,
        roundPixels: false,
        powerPreference: 'high-performance'
    },
    input: {
        activePointers: 2
    },
    scene: BlockPuzzleScene
};

// Expose DPR for scene to use
window.__GAME_DPR = DPR;

if (document.fonts && document.fonts.ready) {
    Promise.race([
        document.fonts.ready,
        new Promise(resolve => setTimeout(resolve, 1500)) // Timeout 1.5 detik
    ]).then(() => {
        new Phaser.Game(config);
    });
} else {
    window.addEventListener('load', () => {
        new Phaser.Game(config);
    });
}
