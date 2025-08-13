import { useEffect } from 'react';
import { applyTheme } from '@/config/themes';

interface ThemeApplicatorProps {
  themeVariant?: string;
}

export function ThemeApplicator({ themeVariant = 'barber' }: ThemeApplicatorProps) {
  useEffect(() => {
    if (themeVariant === 'salon' || themeVariant === 'barber') {
      applyTheme(themeVariant as 'salon' | 'barber');
    }
  }, [themeVariant]);

  return null;
}