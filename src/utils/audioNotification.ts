/**
 * Web Audio API Synthesizer for Telegram's Signature Notification Chimes & Ringtone
 * Fully synchronized with mobile phone & device hardware volume (mute, volume up, volume down)
 */

export class TelegramAudioEngine {
  private ctx: AudioContext | null = null;
  private volume: number = 1.0; // Defaults to 100% device hardware volume output
  private isMuted: boolean = false;
  private ringtoneInterval: any = null;
  private audioUnlocked: boolean = false;

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
    this.unlockAudioOnInteraction = this.unlockAudioOnInteraction.bind(this);
    this.bindHardwareVolumeKeys = this.bindHardwareVolumeKeys.bind(this);

    if (typeof window !== 'undefined') {
      this.initSavedPreferences();
      this.unlockAudioOnInteraction();
      this.bindHardwareVolumeKeys();
    }
  }

  private initSavedPreferences() {
    try {
      const savedMute = localStorage.getItem('tg_sound_muted');
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      }
      const savedVol = localStorage.getItem('tg_sound_volume');
      if (savedVol !== null) {
        const parsed = parseFloat(savedVol);
        if (!isNaN(parsed)) {
          this.volume = Math.max(0, Math.min(1, parsed));
        }
      }
    } catch {}
  }

  /**
   * Automatically unlocks Web Audio API on mobile user gesture (touch/click/keydown)
   * This is required by iOS Safari and Android Chrome to allow audio output
   */
  private unlockAudioOnInteraction() {
    if (typeof window === 'undefined') return;

    const unlockHandler = () => {
      if (this.audioUnlocked) return;
      const ctx = this.getContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().then(() => {
          this.audioUnlocked = true;
          // Play silent buffer to prime audio hardware
          try {
            const buffer = ctx.createBuffer(1, 1, 22050);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(0);
          } catch {}
        }).catch(() => {});
      } else if (ctx && ctx.state === 'running') {
        this.audioUnlocked = true;
      }
    };

    ['touchstart', 'touchend', 'click', 'keydown', 'pointerdown'].forEach((evt) => {
      window.addEventListener(evt, unlockHandler, { once: false, passive: true });
    });
  }

  /**
   * Tracks hardware device volume keys (Volume Up, Volume Down, Mute)
   * Dynamically adapts the in-app audio gain to the physical mobile keys
   */
  private bindHardwareVolumeKeys() {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'AudioVolumeUp' || e.code === 'AudioVolumeUp') {
        this.isMuted = false;
        this.volume = Math.min(1, this.volume + 0.1);
        try {
          localStorage.setItem('tg_sound_volume', this.volume.toString());
          localStorage.setItem('tg_sound_muted', 'false');
        } catch {}
      } else if (e.key === 'AudioVolumeDown' || e.code === 'AudioVolumeDown') {
        this.volume = Math.max(0, this.volume - 0.1);
        if (this.volume <= 0.05) {
          this.volume = 0;
          this.isMuted = true;
        }
        try {
          localStorage.setItem('tg_sound_volume', this.volume.toString());
          localStorage.setItem('tg_sound_muted', this.isMuted.toString());
        } catch {}
      } else if (e.key === 'AudioVolumeMute' || e.code === 'AudioVolumeMute') {
        this.isMuted = !this.isMuted;
        try {
          localStorage.setItem('tg_sound_muted', this.isMuted.toString());
        } catch {}
      }
    });

    // Handle MediaSession actions if available (e.g. bluetooth headset volume controls)
    if ('mediaSession' in navigator) {
      try {
        (navigator as any).mediaSession.setActionHandler?.('togglemute', () => {
          this.isMuted = !this.isMuted;
        });
      } catch {}
    }
  }

  public setVolume(vol: number): void {
    if (typeof vol !== 'number' || isNaN(vol)) return;
    const normalized = vol > 1 ? vol / 100 : vol;
    this.volume = Math.max(0, Math.min(1, normalized));
    if (this.volume > 0) {
      this.isMuted = false;
    } else {
      this.isMuted = true;
    }
    try {
      localStorage.setItem('tg_sound_volume', this.volume.toString());
      localStorage.setItem('tg_sound_muted', this.isMuted.toString());
    } catch {}
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = Boolean(muted);
    if (!this.isMuted && this.volume <= 0) {
      this.volume = 0.8;
    }
    try {
      localStorage.setItem('tg_sound_muted', this.isMuted.toString());
      localStorage.setItem('tg_sound_volume', this.volume.toString());
    } catch {}
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  private triggerHapticFeedback() {
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      try {
        navigator.vibrate(45);
      } catch {}
    }
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
   * Direct output gain directly modulates device hardware volume level
   */
  public playMessageChime(isSilent: boolean = false) {
    if (isSilent || this.isMuted || this.volume <= 0) return;
    try {
      this.triggerHapticFeedback();
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.08); // E6

      // Scales directly with device & mobile volume
      const peakGain = 0.65 * this.volume;
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
      this.triggerHapticFeedback();
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.exponentialRampToValueAtTime(987.77, now + 0.07); // B5

      const peakGain = 0.55 * this.volume;
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

      const peakGain = 0.45 * this.volume;
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

      const peakGain = 0.4 * this.volume;
      gain.gain.setValueAtTime(peakGain, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {}
  }

  public playCallRingtone() {
    if (this.isMuted || this.ringtoneInterval || this.volume <= 0) return;
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

// Proxy wrapper guarantees safe access
export const telegramAudio: TelegramAudioEngine = new Proxy(rawTelegramAudio, {
  get(target: any, prop: string | symbol) {
    if (prop in target) {
      const val = target[prop];
      return typeof val === 'function' ? val.bind(target) : val;
    }
    return (..._args: any[]) => {};
  },
});

if (typeof window !== 'undefined') {
  (window as any).telegramAudio = telegramAudio;
}
