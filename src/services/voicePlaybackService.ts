/**
 * Voice Playback Service with Web Audio API Dynamic Analyser
 * Coordinates voice message playback across ChatView and MessageBubble with real-time waveform visualization
 */

export interface VoicePlaybackState {
  activeMessageId: string | null;
  activeChatId: string | null;
  senderName: string;
  audioUrl?: string;
  duration: number; // in seconds
  currentTime: number;
  progress: number; // 0 to 1
  isPlaying: boolean;
  playbackSpeed: 1 | 1.5 | 2;
  waveform: number[];
  frequencyData: number[]; // Normalized 0..1 for dynamic visualizers (32 bins)
}

type Listener = (state: VoicePlaybackState) => void;

class VoicePlaybackService {
  private state: VoicePlaybackState = {
    activeMessageId: null,
    activeChatId: null,
    senderName: '',
    duration: 0,
    currentTime: 0,
    progress: 0,
    isPlaying: false,
    playbackSpeed: 1,
    waveform: [],
    frequencyData: new Array(32).fill(0),
  };

  private listeners: Set<Listener> = new Set();
  private audioEl: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private animFrameId: number | null = null;
  private synthInterval: number | null = null;
  private synthOsc: OscillatorNode | null = null;
  private synthGain: GainNode | null = null;

  public getState(): VoicePlaybackState {
    return { ...this.state };
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const currentState = this.getState();
    this.listeners.forEach((listener) => listener(currentState));
  }

  private initAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public play(options: {
    messageId: string;
    chatId: string;
    senderName: string;
    duration: number;
    waveform?: number[];
    audioUrl?: string;
  }) {
    const { messageId, chatId, senderName, duration, waveform, audioUrl } = options;

    // If same message is currently playing, pause it
    if (this.state.activeMessageId === messageId && this.state.isPlaying) {
      this.pause();
      return;
    }

    // Stop any currently running audio
    this.stopAudioEngine();

    const initialWaveform = waveform && waveform.length > 0
      ? waveform
      : [25, 45, 65, 80, 50, 30, 75, 90, 100, 65, 40, 55, 75, 95, 80, 45, 30, 60, 85, 70, 50, 35, 65, 80, 40, 25];

    // Check if resuming same message from paused state
    const isResuming = this.state.activeMessageId === messageId && this.state.currentTime > 0;
    const startTime = isResuming ? this.state.currentTime : 0;

    this.state = {
      ...this.state,
      activeMessageId: messageId,
      activeChatId: chatId,
      senderName,
      audioUrl,
      duration: duration || 10,
      currentTime: startTime,
      progress: (duration > 0) ? (startTime / duration) : 0,
      isPlaying: true,
      waveform: initialWaveform,
      frequencyData: new Array(32).fill(0.1),
    };

    this.notify();
    this.startAudioEngine(startTime);
  }

  public pause() {
    if (!this.state.isPlaying) return;
    this.state.isPlaying = false;
    this.stopAudioEngine(false);
    this.notify();
  }

  public resume() {
    if (this.state.activeMessageId && !this.state.isPlaying) {
      this.state.isPlaying = true;
      this.notify();
      this.startAudioEngine(this.state.currentTime);
    }
  }

  public togglePlay(options: {
    messageId: string;
    chatId: string;
    senderName: string;
    duration: number;
    waveform?: number[];
    audioUrl?: string;
  }) {
    if (this.state.activeMessageId === options.messageId) {
      if (this.state.isPlaying) {
        this.pause();
      } else {
        this.resume();
      }
    } else {
      this.play(options);
    }
  }

  public seek(progress: number) {
    const clampedProgress = Math.max(0, Math.min(1, progress));
    const newTime = clampedProgress * this.state.duration;

    this.state.progress = clampedProgress;
    this.state.currentTime = newTime;

    if (this.audioEl && !isNaN(this.audioEl.duration)) {
      this.audioEl.currentTime = clampedProgress * this.audioEl.duration;
    }

    this.notify();
  }

  public setSpeed(speed: 1 | 1.5 | 2) {
    this.state.playbackSpeed = speed;
    if (this.audioEl) {
      this.audioEl.playbackRate = speed;
    }
    this.notify();
  }

  public stop() {
    this.stopAudioEngine(true);
    this.state = {
      activeMessageId: null,
      activeChatId: null,
      senderName: '',
      duration: 0,
      currentTime: 0,
      progress: 0,
      isPlaying: false,
      playbackSpeed: this.state.playbackSpeed,
      waveform: [],
      frequencyData: new Array(32).fill(0),
    };
    this.notify();
  }

  private startAudioEngine(startTime: number) {
    this.initAudioContext();

    if (this.state.audioUrl) {
      try {
        const audio = new Audio(this.state.audioUrl);
        audio.crossOrigin = 'anonymous';
        audio.playbackRate = this.state.playbackSpeed;
        this.audioEl = audio;

        if (this.audioCtx) {
          try {
            this.analyser = this.audioCtx.createAnalyser();
            this.analyser.fftSize = 64;
            this.sourceNode = this.audioCtx.createMediaElementSource(audio);
            this.sourceNode.connect(this.analyser);
            this.analyser.connect(this.audioCtx.destination);
          } catch (e) {
            // In case CORS blocks createMediaElementSource, fallback to playing directly
            console.warn('MediaElementAudioSourceNode fallback', e);
          }
        }

        audio.currentTime = startTime;

        audio.onended = () => {
          this.handlePlaybackComplete();
        };

        audio.play().catch((err) => {
          console.warn('Audio play prevented or URL unavailable, falling back to harmonic synthesizer', err);
          this.startSyntheticAudio(startTime);
        });

        this.startFrequencyAnimationLoop();
        return;
      } catch (e) {
        console.warn('Failed to load audio element, using synthetic engine', e);
      }
    }

    // Fallback: Real-time harmonic synthesizer generates realistic voice-frequency visualization & soft audio tones
    this.startSyntheticAudio(startTime);
  }

  private startSyntheticAudio(startTime: number) {
    // Generate soft, pleasant ambient vocal frequency tones via Web Audio
    if (this.audioCtx) {
      try {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, this.audioCtx.currentTime);
        gain.gain.setValueAtTime(0.015, this.audioCtx.currentTime); // Very soft background tone

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();

        this.synthOsc = osc;
        this.synthGain = gain;
      } catch (err) {
        // Safe silence if blocked by browser policy
      }
    }

    this.startFrequencyAnimationLoop();
  }

  private startFrequencyAnimationLoop() {
    let lastTimestamp = performance.now();
    const dataArray = new Uint8Array(32);

    const updateLoop = (now: number) => {
      const delta = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      if (!this.state.isPlaying) return;

      // Update current time & progress
      if (this.audioEl && !isNaN(this.audioEl.duration) && this.audioEl.duration > 0) {
        this.state.currentTime = this.audioEl.currentTime;
        this.state.progress = Math.min(1, this.audioEl.currentTime / this.audioEl.duration);
      } else {
        const step = delta * this.state.playbackSpeed;
        const newTime = this.state.currentTime + step;
        if (newTime >= this.state.duration) {
          this.handlePlaybackComplete();
          return;
        }
        this.state.currentTime = newTime;
        this.state.progress = Math.min(1, newTime / this.state.duration);
      }

      // Compute dynamic frequency spectrum for the visualizer
      if (this.analyser) {
        this.analyser.getByteFrequencyData(dataArray);
        const normalized = Array.from(dataArray).slice(0, 32).map((val) => val / 255);
        this.state.frequencyData = normalized;
      } else {
        // Procedural organic frequency dance based on waveform and current playback position
        const t = now * 0.006 * this.state.playbackSpeed;
        const currentIdx = Math.floor(this.state.progress * 32);

        const syntheticFreqs = Array.from({ length: 32 }, (_, i) => {
          // Bars closer to the playback head dance more energetically
          const distToHead = Math.abs(i - currentIdx);
          const headFactor = Math.max(0.2, 1 - distToHead / 10);
          const waveAmp = (this.state.waveform[i % this.state.waveform.length] || 50) / 100;
          
          const primaryWave = Math.sin(t + i * 0.4) * 0.4 + 0.5;
          const secondaryWave = Math.cos(t * 1.5 - i * 0.3) * 0.25;
          const combined = (primaryWave + secondaryWave) * waveAmp * headFactor;

          return Math.max(0.08, Math.min(1, combined));
        });

        this.state.frequencyData = syntheticFreqs;
      }

      this.notify();
      this.animFrameId = requestAnimationFrame(updateLoop);
    };

    this.animFrameId = requestAnimationFrame(updateLoop);
  }

  private handlePlaybackComplete() {
    this.stopAudioEngine(false);
    this.state.isPlaying = false;
    this.state.currentTime = 0;
    this.state.progress = 0;
    this.state.frequencyData = new Array(32).fill(0);
    this.notify();
  }

  private stopAudioEngine(resetAudioEl = true) {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.synthOsc) {
      try {
        this.synthOsc.stop();
        this.synthOsc.disconnect();
      } catch (e) {}
      this.synthOsc = null;
    }

    if (this.synthGain) {
      try {
        this.synthGain.disconnect();
      } catch (e) {}
      this.synthGain = null;
    }

    if (this.audioEl) {
      this.audioEl.pause();
      if (resetAudioEl) {
        this.audioEl = null;
      }
    }
  }
}

export const voicePlayback = new VoicePlaybackService();
