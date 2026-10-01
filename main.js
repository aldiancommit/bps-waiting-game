import Phaser from 'phaser';
import { BlockPuzzleScene } from './game/BlockPuzzleScene.js';

/**
 * BPS Waiting Game - Main Entry Point
 * Pixel Art Theme
 */

const config = {
    type: Phaser.AUTO,
    width: 360,
    height: 640,
    parent: document.body,
    backgroundColor: '#F1F5F9',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    render: {
        antialias: false,
        pixelArt: true,
        roundPixels: true,
        powerPreference: 'high-performance'
    },
    input: {
        activePointers: 2
    },
    scene: BlockPuzzleScene
};

if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
        new Phaser.Game(config);
    });
} else {
    window.addEventListener('load', () => {
        new Phaser.Game(config);
    });
}