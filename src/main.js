import Phaser from 'phaser';
import { BlockPuzzleScene } from './scenes/BlockPuzzleScene.js';

/**
 * BPS Waiting Game - Main Entry Point
 * Pixel Art Theme
 */

const DPR = typeof window !== 'undefined'
    ? Math.min(Math.max(window.devicePixelRatio || 1, 2), 3)
    : 2;

const GAME_WIDTH = 360 * DPR;
const GAME_HEIGHT = 640 * DPR;

const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: 'game-root',
    backgroundColor: '#F1F5F9',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        expandParent: true
    },
    render: {
        antialias: true,
        antialiasGL: true,
        pixelArt: false,
        roundPixels: false,
        powerPreference: 'high-performance'
    },
    input: {
        activePointers: 2
    },
    scene: BlockPuzzleScene
};

const startGame = () => {
    new Phaser.Game(config);
};

if (document.fonts && document.fonts.load) {
    Promise.race([
        Promise.all([
            document.fonts.load('10px "Public Pixel"'),
            document.fonts.load('900 16px "Inter"'),
            document.fonts.load('800 16px "Inter"'),
            document.fonts.load('400 10px "Inter"'),
            document.fonts.load('500 10px "Inter"'),
            document.fonts.ready
        ]),
        new Promise(resolve => setTimeout(resolve, 1500))
    ]).then(startGame).catch(startGame);
} else {
    window.addEventListener('load', startGame);
}
