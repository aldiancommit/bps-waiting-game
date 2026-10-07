/**
 * Enhanced 8-Bit Arcade Synthesizer & Haptic Feedback
 * Native WebAudio API Implementation (100% Offline, Zero External Audio Assets)
 */

export class RetroAudio {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (!this.ctx && (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext)) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /**
     * Crisp, snappy 8-bit pickup blip.
     */
    playPickup() {
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.setValueAtTime(783.99, now + 0.025);
            osc.frequency.setValueAtTime(1046.50, now + 0.05);

            gain.gain.setValueAtTime(0.09, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.07);
        } catch (e) { }
    }

    /**
     * Tactile, punchy block drop sound with mechanical thud.
     */
    playPlace() {
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(260, now);
            osc.frequency.exponentialRampToValueAtTime(65, now + 0.08);

            gain.gain.setValueAtTime(0.20, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.08);
        } catch (e) { }
    }

    /**
     * Joyful ascending arpeggio chime on line/cluster clear.
     * Scales notes and sparkle complexity with combo streak.
     */
    playLineClear(combo = 1) {
        this.init();
        if (!this.ctx) return;
        try {
            const scale = [523.25, 659.25, 783.99, 987.77, 1046.50, 1318.51, 1567.98];
            const count = Math.min(scale.length, 3 + combo);
            const step = Math.max(0.035, 0.06 - combo * 0.005);

            for (let i = 0; i < count; i++) {
                const now = this.ctx.currentTime + (i * step);
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = i % 2 === 0 ? 'square' : 'triangle';
                osc.frequency.setValueAtTime(scale[i], now);

                const volume = 0.08 + Math.min(0.06, combo * 0.015);
                gain.gain.setValueAtTime(volume, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.14);
            }
        } catch (e) { }
    }

    /**
     * Special energetic rising power-up fanfare for high combo streaks.
     */
    playCombo(streak = 2) {
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const chords = [659.25, 830.61, 1046.50, 1318.51];
            chords.forEach((freq, idx) => {
                const noteTime = now + (idx * 0.04);
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'square';
                osc.frequency.setValueAtTime(freq, noteTime);

                gain.gain.setValueAtTime(0.09, noteTime);
                gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.18);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(noteTime);
                osc.stop(noteTime + 0.18);
            });
        } catch (e) { }
    }

    /**
     * Grand triumphant 8-bit victory arpeggio for stage score milestones.
     */
    playMilestone() {
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            // Fanfare notes: C5, G4, C5, E5, G5, C6
            const fanfare = [
                { f: 523.25, d: 0.08, t: 0 },
                { f: 392.00, d: 0.08, t: 0.08 },
                { f: 523.25, d: 0.08, t: 0.16 },
                { f: 659.25, d: 0.10, t: 0.24 },
                { f: 783.99, d: 0.12, t: 0.34 },
                { f: 1046.50, d: 0.35, t: 0.46 }
            ];

            fanfare.forEach(note => {
                const noteTime = now + note.t;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'square';
                osc.frequency.setValueAtTime(note.f, noteTime);

                gain.gain.setValueAtTime(0.12, noteTime);
                gain.gain.exponentialRampToValueAtTime(0.001, noteTime + note.d);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(noteTime);
                osc.stop(noteTime + note.d);
            });
        } catch (e) { }
    }

    /**
     * Classic 8-bit retro descent on Game Over.
     */
    playGameOver() {
        this.init();
        if (!this.ctx) return;
        try {
            const notes = [440, 392, 349, 293, 261, 196];
            for (let i = 0; i < notes.length; i++) {
                const now = this.ctx.currentTime + (i * 0.12);
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'square';
                osc.frequency.setValueAtTime(notes[i], now);
                osc.frequency.linearRampToValueAtTime(notes[i] - 15, now + 0.14);

                gain.gain.setValueAtTime(0.10, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.15);
            }
        } catch (e) { }
    }
}

export function triggerHaptic(pattern) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
            navigator.vibrate(pattern);
        } catch (e) { }
    }
}
