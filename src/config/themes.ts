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
  barberLight: {
    name: "Barbearia Light",
    description: "Tema masculino e elegante para barbearias, com fundo claro e cores suaves",
    colors: {
      primary: "#8B5A2B", // Marrom Claro
      secondary: "#D2B48C", // Bege
      accent: "#CD853F", // Marrom Dourado
      muted: "#F5DEB3", // Bege Claro
      highlight: "#FFFFFF" // Branco Puro
    },
    cssVars: {
      '--background': '30 20% 95%', // Bege muito claro
      '--foreground': '25 25% 20%', // Marrom escuro
      '--primary': '25 25% 35%', // #8B5A2B
      '--primary-foreground': '0 0% 100%', // #FFFFFF
      '--secondary': '30 25% 70%', // #D2B48C
      '--secondary-foreground': '25 25% 20%', // Marrom escuro
      '--accent': '30 50% 50%', // #CD853F
      '--accent-foreground': '0 0% 100%', // #FFFFFF
      '--muted': '30 20% 85%', // #F5DEB3
      '--muted-foreground': '25 25% 20%', // Marrom escuro
      '--destructive': '0 84% 60%',
      '--destructive-foreground': '0 0% 100%', // #FFFFFF
      '--border': '30 25% 70%', // #D2B48C
      '--input': '30 20% 85%', // #F5DEB3
      '--ring': '30 50% 50%', // #CD853F
      '--radius': '0.5rem',
      '--card': '30 20% 90%', // Bege claro
      '--card-foreground': '25 25% 20%', // Marrom escuro
      '--popover': '30 20% 90%', // Bege claro
      '--popover-foreground': '25 25% 20%' // Marrom escuro
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
  },
  salonLight: {
    name: "Salão Light",
    description: "Tema feminino e delicado para salões, com fundo claro e cores pastel",
    colors: {
      primary: "#F8C8DC", // Rosa Pastel
      secondary: "#C3B1E1", // Lavanda
      accent: "#FFD1DC", // Rosa Bebê
      muted: "#F0E6FF", // Lavanda Clara
      highlight: "#FFFFFF" // Branco Puro
    },
    cssVars: {
      '--background': '260 20% 98%', // Lavanda muito claro
      '--foreground': '260 10% 25%', // Roxo escuro
      '--primary': '330 70% 88%', // #F8C8DC
      '--primary-foreground': '260 10% 25%', // Roxo escuro
      '--secondary': '250 30% 80%', // #C3B1E1
      '--secondary-foreground': '260 10% 25%', // Roxo escuro
      '--accent': '330 100% 90%', // #FFD1DC
      '--accent-foreground': '260 10% 25%', // Roxo escuro
      '--muted': '260 20% 95%', // #F0E6FF
      '--muted-foreground': '260 10% 25%', // Roxo escuro
      '--destructive': '0 84% 60%',
      '--destructive-foreground': '260 10% 25%', // Roxo escuro
      '--border': '250 30% 80%', // #C3B1E1
      '--input': '260 20% 95%', // #F0E6FF
      '--ring': '330 70% 88%', // #F8C8DC
      '--radius': '0.5rem',
      '--card': '260 20% 97%', // Lavanda claro
      '--card-foreground': '260 10% 25%', // Roxo escuro
      '--popover': '260 20% 97%', // Lavanda claro
      '--popover-foreground': '260 10% 25%' // Roxo escuro
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