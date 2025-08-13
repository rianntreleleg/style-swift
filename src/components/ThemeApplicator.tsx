import { useEffect } from 'react';
import { applyTheme } from '@/config/themes';

interface ThemeApplicatorProps {
  themeVariant?: string;
}

export function ThemeApplicator({ themeVariant = 'barber' }: ThemeApplicatorProps) {
  useEffect(() => {
    // Validar se o tema é válido
    const validThemes = ['salon', 'barber'];
    const theme = validThemes.includes(themeVariant) ? themeVariant : 'barber';
    
    // Aplicar o tema
    applyTheme(theme as 'salon' | 'barber');
    
    // Adicionar classe ao body para facilitar estilos específicos
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    document.body.classList.add(`theme-${theme}`);
    
    console.log(`🎨 Tema aplicado: ${theme}`);
  }, [themeVariant]);

  return null;
}