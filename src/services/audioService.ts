/**
 * audioService.ts - Official Telegram Audio & Notification Sound Subsystem
 * Web Audio API synthesizer for message chimes, sent pops, reaction bubbles, and ringtones.
 */

import { telegramAudio } from '../utils/audioNotification';

export class AudioService {
  private static instance: AudioService;
  private volume: number = 0;
  private isMuted: boolean = true;
  private soundType: string = 'crystal';
  private ringtoneInterval: any = null;

  public static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  public setVolume(vol: number): void {
    if (typeof vol !== 'number' || isNaN(vol)) return;
    const normalized = vol > 1 ? vol / 100 : vol;
    this.volume = Math.max(0, Math.min(1, normalized));
    if (this.volume > 0) {
      this.isMuted = false;
    }
    telegramAudio?.setVolume?.(this.volume);
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = Boolean(muted);
    if (!this.isMuted && this.volume <= 0) {
      this.volume = 0.7;
    }
    telegramAudio?.setMuted?.(this.isMuted);
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setSoundType(type: string): void {
    this.soundType = type;
  }

  public getSoundType(): string {
    return this.soundType;
  }

  public playNotification(_type?: string): void {
    if (this.isMuted) return;
    telegramAudio?.playMessageChime?.(false);
  }

  public playIncoming(): void {
    if (this.isMuted) return;
    telegramAudio?.playMessageChime?.(false);
  }

  public playSent(): void {
    if (this.isMuted) return;
    telegramAudio?.playSentPop?.();
  }

  public playBubblePop(): void {
    if (this.isMuted) return;
    telegramAudio?.playReactionSound?.();
  }

  public playClick(): void {
    if (this.isMuted) return;
    telegramAudio?.playSentPop?.();
  }

  public playReaction(): void {
    if (this.isMuted) return;
    telegramAudio?.playReactionSound?.();
  }

  public playCallRingtone(): void {
    if (this.isMuted) return;
    if (this.ringtoneInterval) return;
    telegramAudio?.playChannelPostSound?.(false);
    this.ringtoneInterval = setInterval(() => {
      telegramAudio?.playChannelPostSound?.(false);
    }, 2800);
  }

  public stopCallRingtone(): void {
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
  }
}

const rawAudioService = AudioService.getInstance();

export const audioService: AudioService = new Proxy(rawAudioService, {
  get(target: any, prop: string | symbol) {
    if (prop in target) {
      const val = target[prop];
      return typeof val === 'function' ? val.bind(target) : val;
    }
    return (..._args: any[]) => {
      // Safe no-op fallback
    };
  },
});

if (typeof window !== 'undefined') {
  (window as any).audioService = audioService;
}
