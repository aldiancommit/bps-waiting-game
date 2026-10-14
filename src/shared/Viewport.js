/**
 * Viewport & Adaptive Logical Height Manager (Pilihan B: Full-screen Adaptive).
 * Computes logical height H = clamp(360 * viewportH / viewportW, 640, 800),
 * eliminates letterboxing/pillarboxing on 9:16 to 20:9 devices,
 * and maintains seamless background color synchronization with active scenes.
 */

export function computeLogicDimensions() {
    if (typeof window === 'undefined') {
        return { logicW: 360, logicH: 640, dpr: 2 };
    }

    const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), 3);

    // Measure safe area inside #app-container or visualViewport
    const appContainer = document.getElementById('app-container');
    const vpW = appContainer?.clientWidth || window.innerWidth || 360;
    const vpH = appContainer?.clientHeight || window.visualViewport?.height || window.innerHeight || 640;

    const ratio = vpH / vpW;
    const logicH = Math.round(Math.min(Math.max(360 * ratio, 640), 800));

    return { logicW: 360, logicH, dpr };
}

export function setSceneThemeColor(bgColor, themeColor = bgColor) {
    if (typeof document === 'undefined') return;
    document.body.style.backgroundColor = bgColor;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', themeColor);
}

export function initViewport(game = null) {
    if (typeof window === 'undefined') return;

    let rafId = null;
    let currentH = game ? Math.round(game.config.height / (game.config.width / 360)) : 640;
    let currentDpr = game ? (game.config.width / 360) : 2;

    const updateHeight = () => {
        const height = window.visualViewport?.height ?? window.innerHeight;
        document.documentElement.style.setProperty('--app-h', `${height}px`);

        if (game && game.scale) {
            const { logicH: newH, dpr: newDpr } = computeLogicDimensions();
            if (Math.abs(newH - currentH) >= 2 || Math.abs(newDpr - currentDpr) > 0.01) {
                currentH = newH;
                currentDpr = newDpr;
                game.scale.setGameSize(360 * newDpr, newH * newDpr);
                game.events.emit('viewport-resize', { logicW: 360, logicH: newH, dpr: newDpr });
            }
            game.scale.refresh();
        }
    };

    const onResize = () => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(updateHeight);
    };

    // Initial update
    updateHeight();

    // Listeners for mobile viewport adjustments
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', onResize, { passive: true });
    }

    return () => {
        if (rafId) cancelAnimationFrame(rafId);
        window.removeEventListener('resize', onResize);
        window.removeEventListener('orientationchange', onResize);
        if (window.visualViewport) {
            window.visualViewport.removeEventListener('resize', onResize);
        }
    };
}
