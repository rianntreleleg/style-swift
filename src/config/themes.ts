// Configuração de temas personalizados

export const THEMES = {
  barber: {
    name: "Barbearia",
    description: "Tema masculino e elegante para barbearias",
    colors: {
      primary: "#8B4513", // Marrom escuro
      secondary: "#D2691E", 
      accent: "#CD853F",
      muted: "#A0522D",
      highlight: "#F4A460"
    },
    cssVars: {
      // Dark theme com marrom
      '--background': '20 25% 8%',
      '--foreground': '48 23% 97%',
      '--primary': '25 76% 31%',
      '--primary-foreground': '48 23% 97%',
      '--secondary': '25 76% 47%',
      '--secondary-foreground': '48 23% 97%',
      '--accent': '25 76% 60%',
      '--accent-foreground': '20 25% 8%',
      '--muted': '25 76% 25%',
      '--muted-foreground': '48 23% 80%',
      '--destructive': '0 84% 60%',
      '--destructive-foreground': '48 23% 97%',
      '--border': '25 76% 20%',
      '--input': '25 76% 15%',
      '--ring': '25 76% 47%',
      '--radius': '0.5rem',
      '--card': '20 25% 10%',
      '--card-foreground': '48 23% 97%',
      '--popover': '20 25% 12%',
      '--popover-foreground': '48 23% 97%'
    }
  },
  salon: {
    name: "Salão de Beleza", 
    description: "Tema feminino e delicado para salões",
    colors: {
      primary: "#E91E63", // Rosa vibrante
      secondary: "#FF69B4", 
      accent: "#FFB6C1",
      muted: "#FFC0CB",
      highlight: "#FF1493"
    },
    cssVars: {
      // Dark theme com rosé
      '--background': '330 25% 8%',
      '--foreground': '330 23% 97%',
      '--primary': '330 76% 55%',
      '--primary-foreground': '330 23% 97%',
      '--secondary': '330 76% 70%',
      '--secondary-foreground': '330 23% 97%',
      '--accent': '330 76% 85%',
      '--accent-foreground': '330 25% 8%',
      '--muted': '330 76% 25%',
      '--muted-foreground': '330 23% 80%',
      '--destructive': '0 84% 60%',
      '--destructive-foreground': '330 23% 97%',
      '--border': '330 76% 20%',
      '--input': '330 76% 15%',
      '--ring': '330 76% 70%',
      '--radius': '0.5rem',
      '--card': '330 25% 10%',
      '--card-foreground': '330 23% 97%',
      '--popover': '330 25% 12%',
      '--popover-foreground': '330 23% 97%'
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