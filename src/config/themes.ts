// Configuração de temas personalizados

export const THEMES = {
  barber: {
    name: "Barbearia",
    description: "Tema masculino e elegante para barbearias",
    colors: {
      primary: "#FCF9F2",
      secondary: "#563A22", 
      accent: "#F1D7B4",
      muted: "#9B7C64",
      highlight: "#F18836"
    },
    cssVars: {
      '--background': '48 23% 97%',
      '--foreground': '30 25% 15%',
      '--primary': '48 23% 97%',
      '--primary-foreground': '30 25% 15%',
      '--secondary': '23 44% 25%',
      '--secondary-foreground': '48 23% 97%',
      '--accent': '32 46% 82%',
      '--accent-foreground': '30 25% 15%',
      '--muted': '32 25% 60%',
      '--muted-foreground': '30 15% 35%',
      '--destructive': '0 84% 60%',
      '--destructive-foreground': '48 23% 97%',
      '--border': '32 25% 85%',
      '--input': '32 25% 85%',
      '--ring': '23 44% 25%',
      '--radius': '0.5rem'
    }
  },
  salon: {
    name: "Salão de Beleza", 
    description: "Tema feminino e delicado para salões",
    colors: {
      primary: "#f3988b",
      secondary: "#637c8b",
      accent: "#d1d1d1", 
      muted: "#353339",
      highlight: "#e2e2e2"
    },
    cssVars: {
      '--background': '0 0% 96%',
      '--foreground': '240 6% 21%',
      '--primary': '7 67% 76%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '206 18% 48%',
      '--secondary-foreground': '0 0% 100%',
      '--accent': '0 0% 82%',
      '--accent-foreground': '240 6% 21%',
      '--muted': '258 5% 22%',
      '--muted-foreground': '0 0% 82%',
      '--destructive': '0 84% 60%',
      '--destructive-foreground': '0 0% 100%',
      '--border': '0 0% 88%',
      '--input': '0 0% 88%',
      '--ring': '7 67% 76%',
      '--radius': '0.5rem'
    }
  }
} as const;

export type ThemeVariant = keyof typeof THEMES;

export const getThemeConfig = (variant: ThemeVariant) => {
  return THEMES[variant] || THEMES.barber;
};

export const applyTheme = (variant: ThemeVariant) => {
  const theme = getThemeConfig(variant);
  const root = document.documentElement;
  
  Object.entries(theme.cssVars).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
};