/**
 * Enhanced 8-Bit Arcade Synthesizer & Haptic Feedback
 * Native WebAudio API Implementation (100% Offline, Zero External Audio Assets)
 */

export class RetroAudio {
    constructor() {
        this.ctx = null;
        this.compressor = null;
        this.masterGain = null;
        this.isMuted = typeof window !== 'undefined'
            ? localStorage.getItem('bps_1010_muted') === 'true'
            : false;
        this.lastClearTime = 0;
    }

    setMuted(muted) {
        this.isMuted = !!muted;
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem('bps_1010_muted', this.isMuted ? 'true' : 'false');
            } catch (e) { }
        }
    }

    toggleMute() {
        this.setMuted(!this.isMuted);
        return this.isMuted;
    }

    getIsMuted() {
        return this.isMuted;
    }

    init() {
        if (!this.ctx && (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext)) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();

            // Mastering Safety Limiter (Clean transparent limiter with fast release, prevents voice clipping)
            this.compressor = this.ctx.createDynamicsCompressor();
            this.compressor.threshold.setValueAtTime(-1, this.ctx.currentTime);
            this.compressor.knee.setValueAtTime(6, this.ctx.currentTime);
            this.compressor.ratio.setValueAtTime(8, this.ctx.currentTime);
            this.compressor.attack.setValueAtTime(0.001, this.ctx.currentTime);
            this.compressor.release.setValueAtTime(0.04, this.ctx.currentTime);

            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

            this.compressor.connect(this.masterGain);
            this.masterGain.connect(this.ctx.destination);
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    _getOut() {
        return this.compressor || this.ctx?.destination;
    }

    _getNow() {
        return (this.ctx?.currentTime || 0) + 0.005; // 5ms lookahead prevents past-time drops on mobile
    }

    /**
     * Crisp, snappy 8-bit pickup blip.
     */
    playPickup() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this._getNow();
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.setValueAtTime(783.99, now + 0.025);
            osc.frequency.setValueAtTime(1046.50, now + 0.05);

            gain.gain.setValueAtTime(0.14, now);
            gain.gain.linearRampToValueAtTime(0.0001, now + 0.075);

            osc.connect(gain);
            gain.connect(this._getOut());
            osc.start(now);
            osc.stop(now + 0.075);
        } catch (e) { }
    }

    /**
     * Tactile, punchy block drop sound with mechanical thud.
     */
    playPlace() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this._getNow();
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(280, now);
            osc.frequency.exponentialRampToValueAtTime(65, now + 0.085);

            gain.gain.setValueAtTime(0.26, now);
            gain.gain.linearRampToValueAtTime(0.0001, now + 0.085);

            osc.connect(gain);
            gain.connect(this._getOut());
            osc.start(now);
            osc.stop(now + 0.085);
        } catch (e) { }
    }

    /**
     * Joyful ascending arpeggio chime on line/cluster clear.
     */
    playLineClear(combo = 1) {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this._getNow();
            const scale = [523.25, 659.25, 783.99, 987.77, 1046.50, 1318.51, 1567.98];
            const count = Math.min(scale.length, 3 + combo);
            const step = Math.max(0.035, 0.055 - combo * 0.003);

            for (let i = 0; i < count; i++) {
                const noteTime = now + (i * step);
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = i % 2 === 0 ? 'square' : 'triangle';
                osc.frequency.setValueAtTime(scale[i], noteTime);

                const volume = 0.13 + Math.min(0.05, combo * 0.012);
                gain.gain.setValueAtTime(volume, noteTime);
                gain.gain.linearRampToValueAtTime(0.0001, noteTime + 0.14);

                osc.connect(gain);
                gain.connect(this._getOut());
                osc.start(noteTime);
                osc.stop(noteTime + 0.14);
            }
        } catch (e) { }
    }

    /**
     * Special energetic rising power-up fanfare for high combo streaks.
     */
    playCombo(streak = 2) {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this._getNow() + 0.06;
            const chords = [659.25, 830.61, 1046.50, 1318.51];
            chords.forEach((freq, idx) => {
                const noteTime = now + (idx * 0.038);
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'square';
                osc.frequency.setValueAtTime(freq, noteTime);

                gain.gain.setValueAtTime(0.12, noteTime);
                gain.gain.linearRampToValueAtTime(0.0001, noteTime + 0.18);

                osc.connect(gain);
                gain.connect(this._getOut());
                osc.start(noteTime);
                osc.stop(noteTime + 0.18);
            });
        } catch (e) { }
    }

    /**
     * Thunderous, cinematic 8-bit arcade bomb blast:
     * - Layer 1: Sub-Bass 808 pitch punch (240Hz -> 28Hz)
     * - Layer 2: Transient shockwave crack (520Hz -> 40Hz)
     * - Layer 3: Heavy resonant lowpass white noise blast (2800Hz -> 35Hz)
     * - Layer 4: Debris sizzle crackle
     */
    playBombExplosion() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this._getNow();

            // 1. Transient Shockwave Slap (Square 520Hz -> 40Hz)
            const click = this.ctx.createOscillator();
            const clickGain = this.ctx.createGain();
            click.type = 'square';
            click.frequency.setValueAtTime(520, now);
            click.frequency.exponentialRampToValueAtTime(40, now + 0.06);
            clickGain.gain.setValueAtTime(0.50, now);
            clickGain.gain.linearRampToValueAtTime(0.0001, now + 0.06);
            click.connect(clickGain);
            clickGain.connect(this._getOut());
            click.start(now);
            click.stop(now + 0.06);

            // 2. Heavy Sub-Bass 808 Boom (Triangle 240Hz -> 26Hz)
            const sub = this.ctx.createOscillator();
            const subGain = this.ctx.createGain();
            sub.type = 'triangle';
            sub.frequency.setValueAtTime(240, now);
            sub.frequency.exponentialRampToValueAtTime(26, now + 0.45);

            subGain.gain.setValueAtTime(0.65, now);
            subGain.gain.linearRampToValueAtTime(0.0001, now + 0.45);

            sub.connect(subGain);
            subGain.connect(this._getOut());
            sub.start(now);
            sub.stop(now + 0.45);

            // 3. Resonant Crackling White Noise Explosion (2800Hz -> 35Hz sweep)
            const bufferSize = Math.floor(this.ctx.sampleRate * 0.45);
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.2);
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.Q.setValueAtTime(3.0, now);
            filter.frequency.setValueAtTime(2800, now);
            filter.frequency.exponentialRampToValueAtTime(35, now + 0.45);

            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.55, now);
            noiseGain.gain.linearRampToValueAtTime(0.0001, now + 0.45);

            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this._getOut());

            noise.start(now);
            noise.stop(now + 0.45);
        } catch (e) { }
    }

    /**
     * Shimmering rainbow wildcard match sparkle.
     */
    playRainbowMatch() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this._getNow();
            const notes = [659.25, 783.99, 987.77, 1318.51, 1567.98];
            notes.forEach((freq, i) => {
                const noteTime = now + (i * 0.03);
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, noteTime);

                gain.gain.setValueAtTime(0.14, noteTime);
                gain.gain.linearRampToValueAtTime(0.0001, noteTime + 0.16);

                osc.connect(gain);
                gain.connect(this._getOut());
                osc.start(noteTime);
                osc.stop(noteTime + 0.16);
            });
        } catch (e) { }
    }

    /**
     * High-energy 8-bit hyper fanfare charge when Fever Mode is triggered.
     */
    playFeverStart() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this._getNow();
            const chords = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
            chords.forEach((freq, idx) => {
                const noteTime = now + (idx * 0.035);
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'square';
                osc.frequency.setValueAtTime(freq, noteTime);

                gain.gain.setValueAtTime(0.14, noteTime);
                gain.gain.linearRampToValueAtTime(0.0001, noteTime + 0.22);

                osc.connect(gain);
                gain.connect(this._getOut());
                osc.start(noteTime);
                osc.stop(noteTime + 0.22);
            });
        } catch (e) { }
    }

    /**
     * Grand triumphant 8-bit victory arpeggio for stage score milestones.
     */
    playMilestone() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this._getNow();
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

                gain.gain.setValueAtTime(0.14, noteTime);
                gain.gain.linearRampToValueAtTime(0.0001, noteTime + note.d);

                osc.connect(gain);
                gain.connect(this._getOut());
                osc.start(noteTime);
                osc.stop(noteTime + note.d);
            });
        } catch (e) { }
    }

    /**
     * Classic 8-bit retro descent on Game Over.
     */
    playGameOver() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;
        try {
            const notes = [440, 392, 349, 293, 261, 196];
            for (let i = 0; i < notes.length; i++) {
                const noteTime = this._getNow() + (i * 0.12);
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'square';
                osc.frequency.setValueAtTime(notes[i], noteTime);
                osc.frequency.linearRampToValueAtTime(notes[i] - 15, noteTime + 0.14);

                gain.gain.setValueAtTime(0.12, noteTime);
                gain.gain.linearRampToValueAtTime(0.0001, noteTime + 0.15);

                osc.connect(gain);
                gain.connect(this._getOut());
                osc.start(noteTime);
                osc.stop(noteTime + 0.15);
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
