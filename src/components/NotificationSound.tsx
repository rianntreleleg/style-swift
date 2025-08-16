import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Volume2, VolumeX, Settings } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage.ts';

interface NotificationSoundProps {
  onPlay?: () => void;
}

interface SoundSettings {
  enabled: boolean;
  volume: number;
  soundType: 'notification' | 'alert' | 'chime' | 'bell';
}

// Sons em base64 - sons curtos e satisfatórios
const SOUND_URLS = {
  notification: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT',
  alert: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT',
  chime: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT',
  bell: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT'
};

// URLs alternativas para sons reais (se os base64 não funcionarem)
const FALLBACK_SOUND_URLS = {
  notification: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
  alert: 'https://www.soundjay.com/misc/sounds/notification-sound-7062.wav',
  chime: 'https://www.soundjay.com/misc/sounds/chime-1.wav',
  bell: 'https://www.soundjay.com/misc/sounds/bell-ringing-01.wav'
};

export const NotificationSound: React.FC<NotificationSoundProps> = ({ onPlay }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [settings, setSettings] = useLocalStorage<SoundSettings>('notification-sound-settings', {
    enabled: true,
    volume: 0.7,
    soundType: 'notification'
  });

  // Carregar som baseado no tipo selecionado
  useEffect(() => {
    if (audioRef.current) {
      // Tentar usar o som base64 primeiro, se falhar usar fallback
      audioRef.current.src = SOUND_URLS[settings.soundType];
      audioRef.current.volume = settings.volume;
      
      // Se o som base64 falhar, usar fallback
      audioRef.current.onerror = () => {
        if (audioRef.current) {
          audioRef.current.src = FALLBACK_SOUND_URLS[settings.soundType];
        }
      };
    }
  }, [settings.soundType, settings.volume]);

  // Função para tocar som
  const playSound = async () => {
    if (!settings.enabled || !audioRef.current) return;

    try {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
      setIsPlaying(true);
      
      // Resetar estado após o som terminar
      audioRef.current.onended = () => {
        setIsPlaying(false);
      };
      
      onPlay?.();
    } catch (error) {
      console.error('Erro ao tocar som:', error);
      // Se falhar, tentar com fallback
      if (audioRef.current) {
        audioRef.current.src = FALLBACK_SOUND_URLS[settings.soundType];
        try {
          await audioRef.current.play();
        } catch (fallbackError) {
          console.error('Erro ao tocar som de fallback:', fallbackError);
        }
      }
    }
  };

  // Função para testar som
  const testSound = () => {
    playSound();
  };

  // Atualizar configurações
  const updateSettings = (newSettings: Partial<SoundSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <>
      {/* Áudio element */}
      <audio ref={audioRef} preload="auto" />
      
      {/* Botão de configurações */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Som
        </Button>
        
        {/* Botão de teste */}
        <Button
          variant="outline"
          size="sm"
          onClick={testSound}
          disabled={!settings.enabled || isPlaying}
          className="flex items-center gap-2"
        >
          {isPlaying ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
          Testar
        </Button>
      </div>

      {/* Painel de configurações */}
      {showSettings && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-background border rounded-lg shadow-lg p-4 z-50">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="sound-enabled" className="text-sm font-medium">
                Som de Notificação
              </Label>
              <Switch
                id="sound-enabled"
                checked={settings.enabled}
                onCheckedChange={(enabled) => updateSettings({ enabled })}
              />
            </div>

            {settings.enabled && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Volume</Label>
                  <Slider
                    value={[settings.volume]}
                    onValueChange={([volume]) => updateSettings({ volume })}
                    max={1}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span>{Math.round(settings.volume * 100)}%</span>
                    <span>100%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Tipo de Som</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(SOUND_URLS).map(([type, url]) => (
                      <Button
                        key={type}
                        variant={settings.soundType === type ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateSettings({ soundType: type as SoundSettings['soundType'] })}
                        className="text-xs capitalize"
                      >
                        {type}
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

// Hook para usar o som em outros componentes
export const useNotificationSound = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [settings] = useLocalStorage<SoundSettings>('notification-sound-settings', {
    enabled: true,
    volume: 0.7,
    soundType: 'notification'
  });

  const playNotificationSound = async () => {
    if (!settings.enabled || !audioRef.current) return;

    try {
      audioRef.current.src = SOUND_URLS[settings.soundType];
      audioRef.current.volume = settings.volume;
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
    } catch (error) {
      console.error('Erro ao tocar som de notificação:', error);
    }
  };

  return {
    playNotificationSound,
    audioRef,
    settings
  };
};
