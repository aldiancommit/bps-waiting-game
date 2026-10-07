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

            // Mastering Limiter (Soft-knee safety limiter, does NOT duck volume during cascades)
            this.compressor = this.ctx.createDynamicsCompressor();
            this.compressor.threshold.setValueAtTime(-2, this.ctx.currentTime);
            this.compressor.knee.setValueAtTime(12, this.ctx.currentTime);
            this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
            this.compressor.attack.setValueAtTime(0.001, this.ctx.currentTime);
            this.compressor.release.setValueAtTime(0.05, this.ctx.currentTime);

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

    /**
     * Crisp, snappy 8-bit pickup blip.
     */
    playPickup() {
        if (this.isMuted) return;
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

            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

            osc.connect(gain);
            gain.connect(this._getOut());
            osc.start(now);
            osc.stop(now + 0.07);
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
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(280, now);
            osc.frequency.exponentialRampToValueAtTime(70, now + 0.08);

            gain.gain.setValueAtTime(0.24, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

            osc.connect(gain);
            gain.connect(this._getOut());
            osc.start(now);
            osc.stop(now + 0.08);
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
            const now = this.ctx.currentTime;
            const scale = [523.25, 659.25, 783.99, 987.77, 1046.50, 1318.51, 1567.98];
            const count = Math.min(scale.length, 3 + combo);
            const step = Math.max(0.035, 0.06 - combo * 0.004);

            for (let i = 0; i < count; i++) {
                const noteTime = now + (i * step);
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = i % 2 === 0 ? 'square' : 'triangle';
                osc.frequency.setValueAtTime(scale[i], noteTime);

                const volume = 0.12 + Math.min(0.06, combo * 0.015);
                gain.gain.setValueAtTime(volume, noteTime);
                gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.14);

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
            const now = this.ctx.currentTime + 0.08;
            const chords = [659.25, 830.61, 1046.50, 1318.51];
            chords.forEach((freq, idx) => {
                const noteTime = now + (idx * 0.04);
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'square';
                osc.frequency.setValueAtTime(freq, noteTime);

                gain.gain.setValueAtTime(0.12, noteTime);
                gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.18);

                osc.connect(gain);
                gain.connect(this._getOut());
                osc.start(noteTime);
                osc.stop(noteTime + 0.18);
            });
        } catch (e) { }
    }

    /**
     * Thunderous, punchy 8-bit bomb blast with 4-stage impact (transient, sub-bass, resonant noise, debris crackle).
     */
    playBombExplosion() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;

            // 1. Sharp Transient Punch Shockwave (450Hz -> 40Hz)
            const click = this.ctx.createOscillator();
            const clickGain = this.ctx.createGain();
            click.type = 'square';
            click.frequency.setValueAtTime(450, now);
            click.frequency.exponentialRampToValueAtTime(40, now + 0.05);
            clickGain.gain.setValueAtTime(0.45, now);
            clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
            click.connect(clickGain);
            clickGain.connect(this._getOut());
            click.start(now);
            click.stop(now + 0.05);

            // 2. Heavy Sub-Bass Boom (180Hz -> 25Hz rumbling boom)
            const sub = this.ctx.createOscillator();
            const subGain = this.ctx.createGain();
            sub.type = 'triangle';
            sub.frequency.setValueAtTime(180, now);
            sub.frequency.exponentialRampToValueAtTime(25, now + 0.40);

            subGain.gain.setValueAtTime(0.55, now);
            subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.40);

            sub.connect(subGain);
            subGain.connect(this._getOut());
            sub.start(now);
            sub.stop(now + 0.40);

            // 3. Resonant Crackling White Noise Explosion
            const bufferSize = Math.floor(this.ctx.sampleRate * 0.42);
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.3);
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2000, now);
            filter.frequency.exponentialRampToValueAtTime(40, now + 0.42);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.50, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this._getOut());

            noise.start(now);
            noise.stop(now + 0.42);
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
            const now = this.ctx.currentTime;
            const notes = [659.25, 783.99, 987.77, 1318.51, 1567.98];
            notes.forEach((freq, i) => {
                const noteTime = now + (i * 0.03);
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, noteTime);

                gain.gain.setValueAtTime(0.14, noteTime);
                gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.16);

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
            const now = this.ctx.currentTime;
            const chords = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
            chords.forEach((freq, idx) => {
                const noteTime = now + (idx * 0.035);
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'square';
                osc.frequency.setValueAtTime(freq, noteTime);

                gain.gain.setValueAtTime(0.14, noteTime);
                gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.22);

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
            const now = this.ctx.currentTime;
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
                gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + note.d);

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
                const now = this.ctx.currentTime + (i * 0.12);
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'square';
                osc.frequency.setValueAtTime(notes[i], now);
                osc.frequency.linearRampToValueAtTime(notes[i] - 15, now + 0.14);

                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

                osc.connect(gain);
                gain.connect(this._getOut());
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
