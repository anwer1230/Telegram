/**
 * Web Audio API Synthesizer for Telegram's Signature Notification Chimes & Ringtone
 */

export class TelegramAudioEngine {
  private ctx: AudioContext | null = null;
  private volume: number = 0;
  private isMuted: boolean = true;
  private ringtoneInterval: any = null;

  constructor() {
    this.setVolume = this.setVolume.bind(this);
    this.getVolume = this.getVolume.bind(this);
    this.setMuted = this.setMuted.bind(this);
    this.getMuted = this.getMuted.bind(this);
    this.playMessageChime = this.playMessageChime.bind(this);
    this.playChannelPostSound = this.playChannelPostSound.bind(this);
    this.playSentPop = this.playSentPop.bind(this);
    this.playReactionSound = this.playReactionSound.bind(this);
    this.playCallRingtone = this.playCallRingtone.bind(this);
    this.stopCallRingtone = this.stopCallRingtone.bind(this);
    this.play = this.play.bind(this);
  }

  public setVolume(vol: number): void {
    if (typeof vol !== 'number' || isNaN(vol)) return;
    const normalized = vol > 1 ? vol / 100 : vol;
    this.volume = Math.max(0, Math.min(1, normalized));
    if (this.volume > 0) {
      this.isMuted = false;
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = Boolean(muted);
    if (!this.isMuted && this.volume <= 0) {
      this.volume = 0.7;
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Signature Telegram Message Chime (Clean, crystal two-tone frequency chime)
   */
  public playMessageChime(isSilent: boolean = false) {
    if (isSilent || this.isMuted || this.volume <= 0) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.08); // E6

      const peakGain = 0.28 * this.volume;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(peakGain, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.38);
    } catch {}
  }

  /**
   * Telegram Channel Broadcast Post Sound (Deeper bell resonance)
   */
  public playChannelPostSound(isSilent: boolean = false) {
    if (isSilent || this.isMuted || this.volume <= 0) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.exponentialRampToValueAtTime(987.77, now + 0.07); // B5

      const peakGain = 0.22 * this.volume;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(peakGain, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.48);
    } catch {}
  }

  /**
   * Telegram Sent Message Pop sound (Subtle tactile click)
   */
  public playSentPop() {
    if (this.isMuted || this.volume <= 0) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.04);

      const peakGain = 0.18 * this.volume;
      gain.gain.setValueAtTime(peakGain, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch {}
  }

  /**
   * Telegram Reaction Pop sound
   */
  public playReactionSound() {
    if (this.isMuted || this.volume <= 0) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.06); // D6

      const peakGain = 0.15 * this.volume;
      gain.gain.setValueAtTime(peakGain, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {}
  }

  public playCallRingtone() {
    if (this.isMuted || this.ringtoneInterval) return;
    this.playChannelPostSound(false);
    this.ringtoneInterval = setInterval(() => {
      this.playChannelPostSound(false);
    }, 2800);
  }

  public stopCallRingtone() {
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
  }

  public play(soundName?: string) {
    if (soundName === 'sent') {
      this.playSentPop();
    } else if (soundName === 'reaction') {
      this.playReactionSound();
    } else if (soundName === 'post') {
      this.playChannelPostSound();
    } else {
      this.playMessageChime();
    }
  }
}

// Create singleton instance
const rawTelegramAudio = new TelegramAudioEngine();

// Proxy wrapper guarantees that any property access (even if not yet defined or legacy) returns a safe no-op callable instead of throwing "is not a function"
export const telegramAudio: TelegramAudioEngine = new Proxy(rawTelegramAudio, {
  get(target: any, prop: string | symbol) {
    if (prop in target) {
      const val = target[prop];
      return typeof val === 'function' ? val.bind(target) : val;
    }
    // Return safe fallback for any method call
    return (..._args: any[]) => {
      // Safe no-op without crashing
    };
  },
});

if (typeof window !== 'undefined') {
  (window as any).telegramAudio = telegramAudio;
}

