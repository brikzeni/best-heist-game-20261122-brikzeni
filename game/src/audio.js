// audio.js — all sound is synthesized with WebAudio. No audio files, no network.
// Created lazily on the first user gesture (autoplay policy); silent until then.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this._stepAt = 0;
  }

  ensure() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  _tone(freq, dur, type, vol, when = 0, slideTo = null) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  click() { this._tone(660, 0.07, 'triangle', 0.08); }
  step() {
    const now = performance.now();
    if (now - this._stepAt < 260) return;
    this._stepAt = now;
    this._tone(140 + Math.random() * 40, 0.05, 'sine', 0.03);
  }
  pickup() {
    this._tone(523, 0.12, 'triangle', 0.1);
    this._tone(784, 0.16, 'triangle', 0.1, 0.09);
  }
  channelTick() { this._tone(880, 0.05, 'square', 0.04); }
  grab() {
    [523, 659, 784, 1046].forEach((f, i) => this._tone(f, 0.22, 'triangle', 0.11, i * 0.09));
  }
  spotted() {
    this._tone(220, 0.3, 'sawtooth', 0.09, 0, 440);
  }
  alarm(level) {
    if (level < 70) return;
    this._tone(440, 0.18, 'square', 0.05);
    this._tone(415, 0.18, 'square', 0.05, 0.2);
  }
  caught() {
    this._tone(196, 0.7, 'sawtooth', 0.12, 0, 98);
    this._tone(147, 0.9, 'sawtooth', 0.1, 0.15, 73);
  }
  win() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => this._tone(f, 0.35, 'triangle', 0.1, i * 0.11));
  }
  smoke() { this._tone(300, 0.25, 'sine', 0.07, 0, 90); }
  emp() {
    this._tone(1200, 0.4, 'sawtooth', 0.06, 0, 120);
  }
}
