import { useEffect } from 'react';
import { applyTheme } from '@/config/themes';

interface ThemeApplicatorProps {
  themeVariant?: string;
}

export function ThemeApplicator({ themeVariant = 'default' }: ThemeApplicatorProps) {
  useEffect(() => {
    // Validar se o tema é válido
    const validThemes = ['default', 'salon', 'barber', 'salonLight', 'barberLight'];
    const theme = validThemes.includes(themeVariant) ? themeVariant : 'default';
    
    if (theme === 'default') {
      // Remover classes de tema específicas
      document.body.className = document.body.className.replace(/theme-\w+/g, '');
      console.log(`🎨 Tema padrão aplicado`);
    } else {
      // Aplicar o tema específico
      applyTheme(theme as 'salon' | 'barber' | 'salonLight' | 'barberLight');
      
      // Adicionar classe ao body para facilitar estilos específicos
      document.body.className = document.body.className.replace(/theme-\w+/g, '');
      document.body.classList.add(`theme-${theme}`);
      
      console.log(`🎨 Tema aplicado: ${theme}`);
    }
  }, [themeVariant]);

  return null;
}