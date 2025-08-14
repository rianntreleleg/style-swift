import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAState {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  showInstallPrompt: boolean;
  isAdmin: boolean;
}

export const usePWA = () => {
  const { user } = useAuth();
  const [pwaState, setPwaState] = useState<PWAState>({
    deferredPrompt: null,
    isInstallable: false,
    isInstalled: false,
    isOnline: navigator.onLine,
    showInstallPrompt: false,
    isAdmin: false
  });

  // Verificar se o usuário é admin
  const checkAdminStatus = useCallback(async () => {
    if (!user) {
      setPwaState(prev => ({ ...prev, isAdmin: false }));
      return;
    }

    try {
      // Verificar se o usuário tem tenants (indicador de admin)
      const { data: tenants, error } = await supabase
        .from('tenants')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1);

      if (error) {
        console.error('Erro ao verificar status de admin:', error);
        setPwaState(prev => ({ ...prev, isAdmin: false }));
        return;
      }

      const isAdmin = tenants && tenants.length > 0;
      setPwaState(prev => ({ ...prev, isAdmin }));
    } catch (error) {
      console.error('Erro ao verificar status de admin:', error);
      setPwaState(prev => ({ ...prev, isAdmin: false }));
    }
  }, [user]);

  // Registrar service worker
  const registerServiceWorker = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registrado com sucesso:', registration);
      } catch (error) {
        console.error('Erro ao registrar Service Worker:', error);
      }
    }
  }, []);

  // Detectar evento de instalação
  const handleBeforeInstallPrompt = useCallback((e: BeforeInstallPromptEvent) => {
    e.preventDefault();
    setPwaState(prev => ({
      ...prev,
      deferredPrompt: e,
      isInstallable: true
    }));
  }, []);

  // Detectar se o app foi instalado
  const handleAppInstalled = useCallback(() => {
    setPwaState(prev => ({
      ...prev,
      isInstalled: true,
      isInstallable: false,
      deferredPrompt: null
    }));
    console.log('PWA instalado com sucesso!');
  }, []);

  // Detectar mudanças de conectividade
  const handleOnlineStatusChange = useCallback(() => {
    setPwaState(prev => ({
      ...prev,
      isOnline: navigator.onLine
    }));
  }, []);

  // Função para instalar o PWA
  const installPWA = useCallback(async () => {
    if (!pwaState.deferredPrompt || !pwaState.isAdmin) {
      console.log('Não é possível instalar: usuário não é admin ou prompt não disponível');
      return false;
    }

    try {
      // Mostrar prompt de instalação
      await pwaState.deferredPrompt.prompt();
      
      // Aguardar escolha do usuário
      const { outcome } = await pwaState.deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('Usuário aceitou a instalação');
        setPwaState(prev => ({
          ...prev,
          isInstalled: true,
          isInstallable: false,
          deferredPrompt: null
        }));
        return true;
      } else {
        console.log('Usuário recusou a instalação');
        return false;
      }
    } catch (error) {
      console.error('Erro durante a instalação:', error);
      return false;
    }
  }, [pwaState.deferredPrompt, pwaState.isAdmin]);

  // Mostrar prompt de instalação manual
  const showInstallPrompt = useCallback(() => {
    if (pwaState.isAdmin && pwaState.isInstallable) {
      setPwaState(prev => ({ ...prev, showInstallPrompt: true }));
    }
  }, [pwaState.isAdmin, pwaState.isInstallable]);

  // Esconder prompt de instalação
  const hideInstallPrompt = useCallback(() => {
    setPwaState(prev => ({ ...prev, showInstallPrompt: false }));
  }, []);

  // Verificar se está em modo standalone (instalado)
  const checkStandaloneMode = useCallback(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone === true;
    
    setPwaState(prev => ({ ...prev, isInstalled: isStandalone }));
  }, []);

  // Efeitos
  useEffect(() => {
    registerServiceWorker();
    checkAdminStatus();
    checkStandaloneMode();
  }, [registerServiceWorker, checkAdminStatus, checkStandaloneMode]);

  useEffect(() => {
    // Event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', handleOnlineStatusChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnlineStatusChange);
      window.removeEventListener('offline', handleOnlineStatusChange);
    };
  }, [handleBeforeInstallPrompt, handleAppInstalled, handleOnlineStatusChange]);

  // Verificar admin status quando user mudar
  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  return {
    ...pwaState,
    installPWA,
    showInstallPromptFn: showInstallPrompt,
    hideInstallPrompt
  };
};
