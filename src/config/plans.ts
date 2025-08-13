// Configuração de planos e funcionalidades

export const PLAN_FEATURES = {
  essential: {
    name: "Essencial",
    price: 2990, // R$ 29,90 em centavos
    maxProfessionals: 1,
    maxEstablishments: 1,
    hasFinancialDashboard: false,
    hasAdvancedReports: false,
    hasCustomThemes: false,
    hasAIBot: false,
    hasSupport: false,
    features: [
      "1 profissional",
      "1 estabelecimento", 
      "Agendamentos básicos",
      "Página pública"
    ]
  },
  professional: {
    name: "Profissional", 
    price: 4390, // R$ 43,90 em centavos
    maxProfessionals: 3,
    maxEstablishments: 1,
    hasFinancialDashboard: true,
    hasAdvancedReports: false,
    hasCustomThemes: true,
    hasAIBot: false,
    hasSupport: true,
    features: [
      "Até 3 profissionais",
      "1 estabelecimento",
      "Dashboard financeiro básico",
      "Tema personalizado",
      "Suporte incluído"
    ]
  },
  premium: {
    name: "Premium",
    price: 7990, // R$ 79,90 em centavos  
    maxProfessionals: 999,
    maxEstablishments: 3,
    hasFinancialDashboard: true,
    hasAdvancedReports: true,
    hasCustomThemes: true,
    hasAIBot: true,
    hasSupport: true,
    features: [
      "Profissionais ilimitados",
      "Até 3 estabelecimentos",
      "Relatórios financeiros completos",
      "Robô de IA",
      "Suporte prioritário"
    ]
  }
} as const;

export type PlanTier = keyof typeof PLAN_FEATURES;

export const getPlanFeatures = (tier: PlanTier | string | null) => {
  if (!tier || !(tier in PLAN_FEATURES)) {
    return PLAN_FEATURES.essential;
  }
  return PLAN_FEATURES[tier as PlanTier];
};

export const canAccessFeature = (userTier: PlanTier | string | null, featureName: keyof typeof PLAN_FEATURES.premium) => {
  const plan = getPlanFeatures(userTier);
  return plan[featureName] === true;
};