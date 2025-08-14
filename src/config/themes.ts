// Configuração de temas personalizados

export interface ThemeConfig {
  [key: string]: {
    name: string;
    description: string;
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      muted: string;
      highlight: string;
    };
    cssVars: {
      [key: string]: string;
    };
  };
}

export const themes: ThemeConfig = {
  barber: {
    name: "Barbearia",
    description: "Tema masculino e elegante para barbearias, com fundo escuro e cores modernas",
    colors: {
      primary: "#1C160F", // Marrom Carvão
      secondary: "#4A3C32", // Marrom Café
      accent: "#C76E36", // Laranja Telha
      muted: "#5C5248", // Cinza Marrom
      highlight: "#EAE4DB" // Branco Creme Suave
    },
    cssVars: {
      '--background': '0 0% 0%', // Preto puro
      '--foreground': '25 76% 91%', // #EAE4DB
      '--primary': '25 15% 7%', // #1C160F
      '--primary-foreground': '25 76% 91%', // #EAE4DB
      '--secondary': '25 15% 24%', // #4A3C32
      '--secondary-foreground': '25 76% 91%', // #EAE4DB
      '--accent': '25 76% 50%', // #C76E36
      '--accent-foreground': '25 15% 7%', // #1C160F
      '--muted': '25 15% 30%', // #5C5248
      '--muted-foreground': '25 76% 91%', // #EAE4DB
      '--destructive': '0 84% 60%',
      '--destructive-foreground': '25 76% 91%', // #EAE4DB
      '--border': '25 15% 30%', // #5C5248
      '--input': '25 15% 24%', // #4A3C32
      '--ring': '25 76% 50%', // #C76E36
      '--radius': '0.5rem',
      '--card': '0 0% 5%', // Cinza muito escuro
      '--card-foreground': '25 76% 91%', // #EAE4DB
      '--popover': '0 0% 5%', // Cinza muito escuro
      '--popover-foreground': '25 76% 91%' // #EAE4DB
    }
  },
  salon: {
    name: "Salão de Beleza",
    description: "Tema feminino e delicado para salões, com fundo escuro e cores sofisticadas",
    colors: {
      primary: "#E9A3C4", // Rosa Blush
      secondary: "#5E6D7E", // Cinza ardósia
      accent: "#F7D26E", // Ouro Envelhecido
      muted: "#EAE2DE", // Bege Claro
      highlight: "#FFFFFF" // Branco Puro
    },
    cssVars: {
      '--background': '220 20% 8%', // Dark Blue
      '--foreground': '30 20% 90%', // #EAE2DE
      '--primary': '330 65% 82%', // #E9A3C4
      '--primary-foreground': '220 20% 8%', // Dark Blue
      '--secondary': '210 15% 45%', // #5E6D7E
      '--secondary-foreground': '30 20% 90%', // #EAE2DE
      '--accent': '46 92% 70%', // #F7D26E
      '--accent-foreground': '220 20% 8%', // Dark Blue
      '--muted': '220 20% 12%', // Dark Blue mais claro
      '--muted-foreground': '30 20% 90%', // #EAE2DE
      '--destructive': '0 84% 60%',
      '--destructive-foreground': '30 20% 90%', // #EAE2DE
      '--border': '210 15% 45%', // #5E6D7E
      '--input': '220 20% 12%', // Dark Blue mais claro
      '--ring': '330 65% 82%', // #E9A3C4
      '--radius': '0.5rem',
      '--card': '220 20% 10%', // Dark Blue médio
      '--card-foreground': '30 20% 90%', // #EAE2DE
      '--popover': '220 20% 10%', // Dark Blue médio
      '--popover-foreground': '30 20% 90%' // #EAE2DE
    }
  }
};

export type ThemeVariant = keyof typeof themes;

export const getThemeConfig = (variant: ThemeVariant) => {
  return themes[variant] || themes.barber;
};

export const applyTheme = (variant: ThemeVariant) => {
  // Se for 'default', não aplicar nenhum tema personalizado
  if (variant === 'default') {
    return;
  }
  
  const theme = getThemeConfig(variant);
  const root = document.documentElement;
  
  Object.entries(theme.cssVars).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
};