import Phaser from 'phaser';
import { OpeningScene } from './scenes/OpeningScene.js';
import { HubScene } from './scenes/HubScene.js';
import { BlockPuzzleScene } from './games/tenten/scenes/BlockPuzzleScene.js';
import { LevelSelectScene } from './games/memory-angka/scenes/LevelSelectScene.js';
import { MemoryScene } from './games/memory-angka/scenes/MemoryScene.js';

/**
 * BPS Waiting Game - Main Entry Point
 * Opening Splash -> Multi-Game Hub (Tenten & Memory Angka)
 *
 * Adaptive Layout (Pilihan B):
 *   logicW = 360 (fixed)
 *   logicH = clamp(360 * viewportH / viewportW, 640, 800)
 *   Game fills the entire safe area without letterboxing.
 *   All UI stays centered at 360×640 via cameras.main.centerOn(180, 320).
 */

const DPR = typeof window !== 'undefined'
    ? Math.min(Math.max(window.devicePixelRatio || 1, 2), 3)
    : 2;

function computeLogicH() {
    if (typeof window === 'undefined') return 640;
    const root = document.getElementById('game-root');
    const vpW = root?.clientWidth || window.visualViewport?.width || window.innerWidth || 360;
    const vpH = root?.clientHeight || window.visualViewport?.height || window.innerHeight || 640;
    if (vpW <= 0 || vpH <= 0) return 640;
    return Math.round(Math.min(Math.max(360 * vpH / vpW, 640), 800));
}

const LOGIC_W = 360;
const LOGIC_H = computeLogicH();
const GAME_WIDTH = LOGIC_W * DPR;
const GAME_HEIGHT = LOGIC_H * DPR;

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
    scene: [OpeningScene, HubScene, BlockPuzzleScene, LevelSelectScene, MemoryScene]
};

const startGame = () => {
    if (window.__bpsGameStarted) return;
    window.__bpsGameStarted = true;
    const game = new Phaser.Game(config);

    // Sync body background + theme-color when a scene starts
    try {
        const SCENE_COLORS = { HubScene: '#EAF1FF' };
        const DEFAULT_COLOR = '#F1F5F9';
        const themeMeta = document.querySelector('meta[name="theme-color"]');
        const applyTheme = (key) => {
            try {
                const color = SCENE_COLORS[key] || DEFAULT_COLOR;
                document.body.style.backgroundColor = color;
                if (themeMeta) themeMeta.setAttribute('content', color);
            } catch (err) {
                console.warn('Theme hook apply error:', err);
            }
        };
        game.events.once(Phaser.Core.Events.READY, () => {
            try {
                game.scene.scenes.forEach((s) => {
                    s.events.on(Phaser.Scenes.Events.CREATE, () => applyTheme(s.sys.settings.key));
                });
            } catch (err) {
                console.warn('Theme hook scene listener error:', err);
            }
        });
    } catch (err) {
        console.warn('Theme hook setup error:', err);
    }

    // Handle viewport resize (toolbar show/hide, rotation)
    let rafId = null;
    let currentH = LOGIC_H;
    const onResize = () => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
            const newH = computeLogicH();
            if (Math.abs(newH - currentH) >= 2) {
                currentH = newH;
                game.scale.setGameSize(LOGIC_W * DPR, newH * DPR);
                game.events.emit('viewport-resize', { logicW: LOGIC_W, logicH: newH, dpr: DPR });
            }
            game.scale.refresh();
        });
    };

    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', onResize, { passive: true });
    }
};

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    startGame();
} else {
    window.addEventListener('DOMContentLoaded', startGame);
}
