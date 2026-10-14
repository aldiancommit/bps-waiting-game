import Phaser from 'phaser';
import { OpeningScene } from './scenes/OpeningScene.js';
import { HubScene } from './scenes/HubScene.js';
import { BlockPuzzleScene } from './games/tenten/scenes/BlockPuzzleScene.js';
import { LevelSelectScene } from './games/memory-angka/scenes/LevelSelectScene.js';
import { MemoryScene } from './games/memory-angka/scenes/MemoryScene.js';
import { computeLogicDimensions, initViewport } from './shared/Viewport.js';

/**
 * BPS Waiting Game - Main Entry Point
 * Opening Splash -> Multi-Game Hub (Tenten & Memory Angka)
 */

const { logicW, logicH, dpr } = computeLogicDimensions();

const GAME_WIDTH = logicW * dpr;
const GAME_HEIGHT = logicH * dpr;

const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: 'game-root',
    backgroundColor: '#EBF3FB',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.NO_CENTER,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        expandParent: false
    },
    render: {
        antialias: true,
        antialiasGL: true,
        pixelArt: false,
        roundPixels: true,
        powerPreference: 'high-performance'
    },
    input: {
        activePointers: 2
    },
    scene: [OpeningScene, HubScene, BlockPuzzleScene, LevelSelectScene, MemoryScene]
};

const startGame = () => {
    if (window.__bpsGameStarted) return;
    window.__bpsGameStarted = true;
    const game = new Phaser.Game(config);
    window.__bpsGame = game;
    initViewport(game);
};

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    startGame();
} else {
    window.addEventListener('DOMContentLoaded', startGame);
}
