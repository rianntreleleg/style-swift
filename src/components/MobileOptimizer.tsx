import React, { useEffect } from 'react';

interface MobileOptimizerProps {
  children: React.ReactNode;
}

export const MobileOptimizer: React.FC<MobileOptimizerProps> = ({ children }) => {
  useEffect(() => {
    // Prevenir zoom em inputs no iOS
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    // Prevenir zoom em inputs
    const preventInputZoom = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        target.style.fontSize = '16px';
      }
    };

    // Adicionar listeners
    document.addEventListener('touchstart', preventZoom, { passive: false });
    document.addEventListener('focusin', preventInputZoom);

    // Configurar viewport para mobile
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover');
    }

    // Adicionar classes CSS para mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      document.body.classList.add('mobile-device');
    }

    // Configurar altura da viewport para mobile
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);

    return () => {
      document.removeEventListener('touchstart', preventZoom);
      document.removeEventListener('focusin', preventInputZoom);
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
      document.body.classList.remove('mobile-device');
    };
  }, []);

  return <>{children}</>;
};
