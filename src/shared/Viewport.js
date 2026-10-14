/**
 * Viewport & Application Height Manager.
 * Synchronizes `--app-h` with window.visualViewport to eliminate mobile browser
 * address bar / virtual keyboard clipping and dynamic orientation shifts.
 */

export function initViewport(game = null) {
    if (typeof window === 'undefined') return;

    let rafId = null;

    const updateHeight = () => {
        const height = window.visualViewport?.height ?? window.innerHeight;
        document.documentElement.style.setProperty('--app-h', `${height}px`);

        if (game && game.scale) {
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
