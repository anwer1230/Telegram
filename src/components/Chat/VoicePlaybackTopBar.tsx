import React, { useEffect, useState, useRef } from 'react';
import { Play, Pause, X, Mic, LocateFixed } from 'lucide-react';
import { voicePlayback, type VoicePlaybackState } from '../../services/voicePlaybackService';
import { useTelegram } from '../../context/TelegramContext';

export const VoicePlaybackTopBar: React.FC = () => {
  const { settings, activeChatId } = useTelegram();
  const [state, setState] = useState<VoicePlaybackState>(voicePlayback.getState());
  const [isScrubbing, setIsScrubbing] = useState(false);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsubscribe = voicePlayback.subscribe((newState) => {
      setState(newState);
    });
    return () => unsubscribe();
  }, []);

  if (!state.activeMessageId) {
    return null;
  }

  const isArabic = settings.language === 'ar';

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleTogglePlay = () => {
    if (state.isPlaying) {
      voicePlayback.pause();
    } else {
      voicePlayback.resume();
    }
  };

  const handleSpeedToggle = () => {
    const nextSpeed: Record<number, 1 | 1.5 | 2> = { 1: 1.5, 1.5: 2, 2: 1 };
    voicePlayback.setSpeed(nextSpeed[state.playbackSpeed]);
  };

  const handleStop = () => {
    voicePlayback.stop();
  };

  const handleJumpToMessage = () => {
    if (!state.activeMessageId) return;
    const customEvent = new CustomEvent('tg-scroll-to-message', {
      detail: { messageId: state.activeMessageId },
    });
    window.dispatchEvent(customEvent);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, clickX / rect.width));
    voicePlayback.seek(progress);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isScrubbing || !progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, clickX / rect.width));
    voicePlayback.seek(progress);
  };

  // Generate 48 visualizer bars for top bar dynamic spectrum
  const numBars = 48;
  const bars = Array.from({ length: numBars }, (_, i) => {
    const barProgress = i / numBars;
    const isPassed = barProgress <= state.progress;

    // Use live frequency data or waveform amplitude
    const freqIndex = Math.floor((i / numBars) * state.frequencyData.length);
    const liveFreq = state.frequencyData[freqIndex] || 0.1;
    const baseAmp = state.waveform.length > 0
      ? (state.waveform[i % state.waveform.length] / 100)
      : 0.5;

    // Height calculations: active bars bounce dynamically when playing
    const dynamicBoost = state.isPlaying ? (liveFreq * 16) : 0;
    const height = Math.max(4, Math.min(24, Math.round(baseAmp * 14 + dynamicBoost)));

    return {
      height,
      isPassed,
    };
  });

  return (
    <div
      id="tg-voice-playback-top-bar"
      className="z-20 px-3 py-2 flex items-center gap-3 border-b backdrop-blur-md shadow-xs select-none shrink-0 animate-in slide-in-from-top-2 duration-200"
      style={{
        backgroundColor: 'var(--tg-theme-surface)',
        borderColor: 'var(--tg-theme-border)',
      }}
    >
      {/* Play/Pause Button */}
      <button
        onClick={handleTogglePlay}
        className="w-8 h-8 rounded-full bg-[#2481cc] hover:bg-[#1c6fad] active:scale-95 text-white flex items-center justify-center transition-transform shrink-0 shadow-xs"
        title={state.isPlaying ? (isArabic ? 'إيقاف مؤقت' : 'Pause') : (isArabic ? 'تشغيل' : 'Play')}
      >
        {state.isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current ml-0.5" />
        )}
      </button>

      {/* Voice Info & Sender */}
      <div className="flex flex-col min-w-0 max-w-[140px] sm:max-w-[200px] shrink-0">
        <div className="flex items-center gap-1 text-[11px] font-bold text-[#2481cc] truncate">
          <Mic className="w-3 h-3 shrink-0" />
          <span className="truncate">{state.senderName || (isArabic ? 'رسالة صوتية' : 'Voice Message')}</span>
        </div>
        <div className="text-[10px] text-gray-400 font-mono">
          {formatTime(state.currentTime)} / {formatTime(state.duration)}
        </div>
      </div>

      {/* Dynamic Waveform Visualizer & Scrub Area */}
      <div
        ref={progressBarRef}
        onClick={handleSeek}
        onMouseDown={() => setIsScrubbing(true)}
        onMouseUp={() => setIsScrubbing(false)}
        onMouseLeave={() => setIsScrubbing(false)}
        onMouseMove={handleMouseMove}
        className="flex-1 flex items-center justify-between gap-[2px] h-8 px-2 rounded-xl bg-black/5 dark:bg-white/5 cursor-pointer group hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        title={isArabic ? 'اسحب للتنقل في التسجيل الصوتي' : 'Scrub to seek audio'}
      >
        {bars.map((bar, idx) => (
          <div
            key={idx}
            className="flex-1 flex items-center justify-center h-full min-w-[2px]"
          >
            <span
              className={`w-full max-w-[3px] rounded-full transition-all duration-75 ${
                bar.isPassed
                  ? 'bg-[#2481cc]'
                  : 'bg-gray-400/40 group-hover:bg-gray-400/60'
              }`}
              style={{
                height: `${bar.height}px`,
              }}
            />
          </div>
        ))}
      </div>

      {/* Speed Toggle */}
      <button
        onClick={handleSpeedToggle}
        className="px-1.5 py-0.5 rounded-md font-bold text-[11px] text-[#2481cc] hover:bg-[#2481cc]/10 active:scale-95 transition-all shrink-0"
        title={isArabic ? 'سرعة التشغيل' : 'Playback Speed'}
      >
        {state.playbackSpeed}x
      </button>

      {/* Jump to message in chat */}
      <button
        onClick={handleJumpToMessage}
        className="p-1.5 text-gray-400 hover:text-[#2481cc] rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0"
        title={isArabic ? 'الانتقال إلى الرسالة الصوتية في المحادثة' : 'Jump to voice message in chat'}
      >
        <LocateFixed className="w-4 h-4" />
      </button>

      {/* Stop & Dismiss */}
      <button
        onClick={handleStop}
        className="p-1.5 text-gray-400 hover:text-red-400 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0"
        title={isArabic ? 'إيقاف وإغلاق' : 'Stop & Close'}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
