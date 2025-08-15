import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isOnline: boolean;
  isAdmin: boolean;
  showBanner: boolean;
  showInstallPrompt: () => Promise<void>;
  dismissInstallPrompt: () => void;
  dismissBanner: () => void;
  hideInstallPrompt: () => void;
  installPWA: () => Promise<void>;
  showInstallPromptFn: () => Promise<void>;
  canInstall: boolean;
}

export const usePWA = (): PWAInstallState => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  // Detectar se é iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  // Detectar se é Android
  const isAndroid = /Android/.test(navigator.userAgent);
  
  // Detectar se está em modo standalone (instalado)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  useEffect(() => {
    // Verificar se já está instalado
    setIsInstalled(isStandalone);

    // Se não está instalado, verificar se deve mostrar banner
    if (!isStandalone) {
      // Verificar se o usuário já dismissou o banner (localStorage)
      const dismissed = localStorage.getItem('pwa-banner-dismissed');
      const dismissedDate = dismissed ? new Date(dismissed) : null;
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      // Mostrar banner se:
      // 1. Nunca foi dismissado OU
      // 2. Foi dismissado há mais de 3 dias OU  
      // 3. É iOS/Android (que podem não suportar beforeinstallprompt)
      const shouldShow = !dismissed || 
        (dismissedDate && dismissedDate < threeDaysAgo) ||
        (isIOS || isAndroid);
        
      if (shouldShow) {
        setTimeout(() => setShowBanner(true), 1500); // 1.5s delay para UX mais agressiva
      }
    }

    // Listener para o evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setInstallPrompt(promptEvent);
      setIsInstallable(true);
      setShowBanner(true); // Mostrar banner quando evento é disparado
      console.log('PWA: Install prompt available');
    };

    // Listener para quando o app é instalado
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setInstallPrompt(null);
      setShowBanner(false);
      localStorage.removeItem('pwa-banner-dismissed'); // Limpar estado
      console.log('PWA: App was installed');
    };

    // Adicionar listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isStandalone, isIOS, isAndroid]);

  const showInstallPrompt = async (): Promise<void> => {
    if (!installPrompt) {
      console.log('PWA: No install prompt available');
      return;
    }

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('PWA: User accepted the install prompt');
        setIsInstallable(false);
        setInstallPrompt(null);
      } else {
        console.log('PWA: User dismissed the install prompt');
      }
    } catch (error) {
      console.error('PWA: Error showing install prompt:', error);
    }
  };

  const dismissInstallPrompt = (): void => {
    setIsInstallable(false);
    setInstallPrompt(null);
  };

  const dismissBanner = (): void => {
    setShowBanner(false);
    localStorage.setItem('pwa-banner-dismissed', new Date().toISOString());
  };

  // Determinar se pode instalar (considerando diferentes plataformas)
  const canInstall = isInstallable || (isIOS && !isStandalone);

  // Detectar se está online
  const isOnline = navigator.onLine;

  // Para compatibilidade - assumir que não é admin por padrão
  const isAdmin = false;

  // Aliases para compatibilidade
  const hideInstallPrompt = dismissInstallPrompt;
  const installPWA = showInstallPrompt;
  const showInstallPromptFn = showInstallPrompt;

  return {
    isInstallable,
    isInstalled,
    isStandalone,
    isIOS,
    isAndroid,
    isOnline,
    isAdmin,
    showBanner,
    showInstallPrompt,
    dismissInstallPrompt,
    dismissBanner,
    hideInstallPrompt,
    installPWA,
    showInstallPromptFn,
    canInstall
  };
};