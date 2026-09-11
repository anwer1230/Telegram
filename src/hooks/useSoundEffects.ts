/**
 * useSoundEffects.ts - Sound Effects Hook for Telegram Chat Interactions
 */

import { useCallback } from 'react';
import { audioService } from '../services/audioService';

export function useSoundEffects() {
  const playSendSound = useCallback(() => {
    audioService.playSent();
  }, []);

  const playIncomingSound = useCallback(() => {
    audioService.playIncoming();
  }, []);

  const playClickSound = useCallback(() => {
    audioService.playClick();
  }, []);

  const playBubbleSound = useCallback(() => {
    audioService.playBubblePop();
  }, []);

  return {
    playSendSound,
    playIncomingSound,
    playClickSound,
    playBubbleSound,
  };
}
