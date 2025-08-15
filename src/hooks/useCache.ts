import { useState, useEffect, useCallback } from 'react';

interface CacheStatus {
  isOnline: boolean;
  isInstalled: boolean;
  cacheSize: number;
  lastSync: Date | null;
  pendingSync: boolean;
}

export const useCache = () => {
  const [status, setStatus] = useState<CacheStatus>({
    isOnline: navigator.onLine,
    isInstalled: false,
    cacheSize: 0,
    lastSync: null,
    pendingSync: false,
  });

  // Verificar se o PWA está instalado
  const checkInstallation = useCallback(() => {
    if ('serviceWorker' in navigator && 'caches' in window) {
      // Verificar se está em modo standalone (instalado)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      setStatus(prev => ({ ...prev, isInstalled: isStandalone }));
    }
  }, []);

  // Verificar tamanho do cache
  const checkCacheSize = useCallback(async () => {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        let totalSize = 0;

        for (const cacheName of cacheNames) {
          if (cacheName.includes('styleswift')) {
            const cache = await caches.open(cacheName);
            const keys = await cache.keys();
            totalSize += keys.length;
          }
        }

        setStatus(prev => ({ ...prev, cacheSize: totalSize }));
      } catch (error) {
        console.error('Error checking cache size:', error);
      }
    }
  }, []);

  // Limpar cache
  const clearCache = useCallback(async () => {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter(name => name.includes('styleswift'))
            .map(name => caches.delete(name))
        );
        
        await checkCacheSize();
        console.log('Cache cleared successfully');
      } catch (error) {
        console.error('Error clearing cache:', error);
      }
    }
  }, [checkCacheSize]);

  // Forçar sincronização
  const forceSync = useCallback(async () => {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('background-sync');
        
        setStatus(prev => ({ 
          ...prev, 
          pendingSync: true,
          lastSync: new Date()
        }));
        
        console.log('Background sync registered');
      } catch (error) {
        console.error('Error registering background sync:', error);
      }
    }
  }, []);

  // Pré-carregar recursos importantes
  const preloadResources = useCallback(async () => {
    if ('caches' in window) {
      try {
        const cache = await caches.open('styleswift-static-v1.4.0');
        const resources = [
          '/admin',
          '/auth',
          '/subscription',
          '/offline.html'
        ];

        await Promise.allSettled(
          resources.map(resource => 
            cache.add(resource).catch(err => 
              console.warn(`Failed to preload ${resource}:`, err)
            )
          )
        );

        console.log('Resources preloaded successfully');
      } catch (error) {
        console.error('Error preloading resources:', error);
      }
    }
  }, []);

  // Monitorar status online/offline
  useEffect(() => {
    const handleOnline = () => setStatus(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setStatus(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Verificar instalação e cache na inicialização
  useEffect(() => {
    checkInstallation();
    checkCacheSize();
  }, [checkInstallation, checkCacheSize]);

  // Pré-carregar recursos quando online
  useEffect(() => {
    if (status.isOnline) {
      preloadResources();
    }
  }, [status.isOnline, preloadResources]);

  return {
    ...status,
    clearCache,
    forceSync,
    preloadResources,
    checkCacheSize,
  };
};
