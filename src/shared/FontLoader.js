/**
 * Safe Font Loader for BPS Waiting Game.
 * Ensures critical fonts (Poppins, Inter, Public Pixel) are loaded into the browser
 * before canvas / texture rasterization begins, with a safe 2-second fallback timeout.
 */

export async function ensureFontsLoaded(timeoutMs = 2000) {
    if (typeof document === 'undefined' || !document.fonts) return;

    const fontLoads = [
        document.fonts.load('400 12px "Poppins"'),
        document.fonts.load('700 12px "Poppins"'),
        document.fonts.load('400 12px "Inter"'),
        document.fonts.load('700 12px "Inter"'),
        // Public Pixel will resolve if file is placed in public/fonts/ or fallback gracefully
        document.fonts.load('400 10px "Public Pixel"')
    ];

    const timeout = new Promise(resolve => setTimeout(resolve, timeoutMs));

    try {
        await Promise.race([Promise.allSettled(fontLoads), timeout]);
    } catch {
        // Fallback gracefully without blocking game execution
    }
}
