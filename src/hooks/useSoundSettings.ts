import { useState, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

interface SoundSettings {
  enabled: boolean;
  volume: number;
  type: 'notification' | 'alert' | 'chime' | 'bell';
}

const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  enabled: true,
  volume: 0.7,
  type: 'notification'
};

// Configurações de som usando Web Audio API
const SOUND_CONFIGS = {
  notification: { frequency: 800, duration: 0.3, type: 'sine' },
  alert: { frequency: 1200, duration: 0.2, type: 'square' },
  chime: { frequency: 600, duration: 0.4, type: 'triangle' },
  bell: { frequency: 400, duration: 0.5, type: 'sine' }
};

export const useSoundSettings = () => {
  const [settings, setSettings] = useLocalStorage<SoundSettings>('notification-sound-settings', DEFAULT_SOUND_SETTINGS);
  
  const updateSettings = (newSettings: Partial<SoundSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };
  
  const playSound = async () => {
    if (!settings.enabled) return;
    
    try {
      // Usar Web Audio API para gerar som
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      const config = SOUND_CONFIGS[settings.type];
      oscillator.frequency.value = config.frequency;
      oscillator.type = config.type as OscillatorType;
      
      // Aplicar volume e fade out
      gainNode.gain.setValueAtTime(settings.volume * 0.3, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + config.duration);
      
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + config.duration);
    } catch (error) {
      console.error('Erro ao tocar som:', error);
    }
  };
  
  return {
    settings,
    updateSettings,
    playSound
  };
};