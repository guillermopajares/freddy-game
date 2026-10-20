// Efectos y música sintetizados con Web Audio: sin ficheros de audio.
// El navegador solo deja arrancar el audio tras una pulsación (ver main.js).
const midi = n => 440 * 2 ** ((n - 69) / 12);

const MUSIC = {
    level: {
        step: 150,
        bass: [45, null, 45, null, 48, null, 50, null, 45, null, 45, null, 43, null, 40, null],
        lead: [69, null, 72, null, 76, null, 74, 72, null, null, 69, null, 67, null, 64, null],
    },
    boss: {
        step: 110,
        bass: [40, 40, 52, 40, 40, 52, 43, 44, 40, 40, 52, 40, 47, 46, 45, 44],
        lead: [76, null, null, 75, null, null, 74, null, 76, null, null, 79, null, null, 77, null],
    },
};

const Sound = {
    ctx: null,
    master: null,
    muted: false,
    musicName: null,
    musicTimer: null,

    unlock() {
        if (this.ctx) {
            if (this.ctx.state === 'suspended') this.ctx.resume();
            return;
        }
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
    },

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    },

    tone(freq, duration, { type = 'square', volume = 0.12, slide = 0, delay = 0 } = {}) {
        if (!this.ctx || this.muted) return;
        const t = this.ctx.currentTime + delay;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + duration);
        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        osc.connect(gain).connect(this.master);
        osc.start(t);
        osc.stop(t + duration);
    },

    noise(duration, volume = 0.15, delay = 0) {
        if (!this.ctx || this.muted) return;
        const length = Math.floor(this.ctx.sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
        const src = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();
        src.buffer = buffer;
        gain.gain.value = volume;
        src.connect(gain).connect(this.master);
        src.start(this.ctx.currentTime + delay);
    },

    play(name) {
        switch (name) {
            case 'jump': this.tone(300, 0.12, { slide: 300, volume: 0.07 }); break;
            case 'doubleJump': this.tone(450, 0.12, { slide: 400, volume: 0.07 }); break;
            case 'land': this.noise(0.08, 0.1); break;
            case 'dash': this.noise(0.12, 0.1); this.tone(800, 0.12, { type: 'sine', slide: -500, volume: 0.06 }); break;
            case 'throw': this.tone(600, 0.08, { type: 'triangle', slide: -300 }); break;
            case 'throwBig': this.tone(200, 0.3, { type: 'sawtooth', slide: 400 }); break;
            case 'melee': this.noise(0.08, 0.12); this.tone(150, 0.1, { type: 'sine', slide: -80, volume: 0.2 }); break;
            case 'hit': this.tone(180, 0.08, { slide: -100 }); break;
            case 'kill':
                this.tone(500, 0.08);
                this.tone(250, 0.15, { delay: 0.06, slide: -150 });
                this.noise(0.15, 0.08);
                break;
            case 'stomp': this.tone(120, 0.15, { type: 'sine', slide: -60, volume: 0.3 }); this.noise(0.1, 0.1); break;
            case 'hurt': this.tone(220, 0.25, { type: 'sawtooth', slide: -150 }); break;
            case 'shield': this.tone(1000, 0.25, { type: 'sine', slide: -600, volume: 0.15 }); break;
            case 'coin': this.tone(988, 0.06, { volume: 0.06 }); this.tone(1319, 0.12, { delay: 0.06, volume: 0.06 }); break;
            case 'paper':
                this.tone(660, 0.08, { type: 'triangle' });
                this.tone(880, 0.1, { type: 'triangle', delay: 0.07 });
                break;
            case 'power':
                [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.12, { type: 'triangle', delay: i * 0.07 }));
                break;
            case 'steal': this.tone(900, 0.2, { type: 'square', slide: -700, volume: 0.06 }); break;
            case 'enemyShot': this.tone(1200, 0.07, { slide: -800, volume: 0.04 }); break;
            case 'goo': this.tone(100, 0.15, { type: 'sine', slide: 200, volume: 0.12 }); break;
            case 'checkpoint': this.tone(659, 0.1, { type: 'triangle' }); this.tone(784, 0.2, { type: 'triangle', delay: 0.1 }); break;
            case 'boss':
                this.tone(110, 0.9, { type: 'sawtooth', slide: -50, volume: 0.12 });
                this.tone(116, 0.9, { type: 'sawtooth', slide: -50, volume: 0.12 });
                break;
            case 'bossPhase': this.noise(0.5, 0.2); this.tone(80, 0.6, { type: 'sawtooth', slide: 200, volume: 0.15 }); break;
            case 'portal': this.tone(200, 0.6, { type: 'sine', slide: 900, volume: 0.15 }); break;
            case 'gameOver':
                [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.25, { type: 'triangle', delay: i * 0.22 }));
                break;
            case 'victory':
                [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.18, { type: 'square', delay: i * 0.13, volume: 0.07 }));
                break;
        }
    },

    music(name) {
        if (this.musicName === name) return;
        clearInterval(this.musicTimer);
        this.musicName = name;
        if (!name) return;
        const track = MUSIC[name];
        let step = 0;
        this.musicTimer = setInterval(() => {
            const i = step++ % track.bass.length;
            const len = track.step / 1000;
            if (track.bass[i]) this.tone(midi(track.bass[i]), len * 0.9, { type: 'triangle', volume: 0.07 });
            if (track.lead[i]) this.tone(midi(track.lead[i]), len * 0.8, { volume: 0.025 });
        }, track.step);
    },
};
