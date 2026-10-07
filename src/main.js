import Phaser from 'phaser';
import { BlockPuzzleScene } from './scenes/BlockPuzzleScene.js';

/**
 * BPS Waiting Game - Main Entry Point
 * Pixel Art Theme
 */

const GAME_WIDTH = 360;
const GAME_HEIGHT = 640;

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
        antialias: false,
        antialiasGL: false,
        pixelArt: true,
        roundPixels: true,
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
            document.fonts.ready
        ]),
        new Promise(resolve => setTimeout(resolve, 1500))
    ]).then(startGame).catch(startGame);
} else {
    window.addEventListener('load', startGame);
}
