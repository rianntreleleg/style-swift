// Configuração de planos e funcionalidades

export const PLAN_FEATURES = {
  essential: {
    name: "Essencial",
    price: 2990, // R$ 29,90 em centavos
    maxProfessionals: 1,
    hasFinancialDashboard: false,
    hasAdvancedReports: false,
    hasCustomThemes: false,
    hasAIBot: false,
    hasSupport: false,
    hasAutoConfirmation: false,
    hasBulkActions: false,
    hasBackup: false,
    features: [
      "Dashboard comum",
      "Agendamentos do dia e histórico",
      "Serviços ilimitados",
      "1 profissional cadastrado",
      "Página pública"
    ],
    limitations: [
      "Sem dashboard financeiro",
      "Sem lembrete automático 1h antes",
      "Sem suporte",
      "Sem backup automático"
    ]
  },
  professional: {
    name: "Profissional", 
    price: 4390, // R$ 43,90 em centavos
    maxProfessionals: 3,
    hasFinancialDashboard: true,
    hasAdvancedReports: false,
    hasCustomThemes: true,
    hasAIBot: false,
    hasSupport: true,
    hasAutoConfirmation: true,
    hasBulkActions: true,
    hasBackup: false,
    features: [
      "Dashboard financeiro + todas as funções do Essencial",
      "Até 3 profissionais cadastrados",
      "Lembrete automático 1h antes + e-mail de confirmação",
      "Tema personalizado",
      "Suporte completo"
    ],
    limitations: [
      "Sem relatórios avançados",
      "Sem robô de atendimento 24h",
      "Sem backup automático"
    ]
  },
  premium: {
    name: "Premium",
    price: 7990, // R$ 79,90 em centavos  
    maxProfessionals: 999,
    hasFinancialDashboard: true,
    hasAdvancedReports: true,
    hasCustomThemes: true,
    hasAIBot: true,
    hasSupport: true,
    hasAutoConfirmation: true,
    hasBulkActions: true,
    hasBackup: true,
    features: [
      "Dashboard financeiro",
      "Relatórios completos",
      "Profissionais ilimitados",
      "Robô de atendimento 24h",
      "Lembrete automático 1h antes",
      "E-mail de confirmação",
      "Tema persoalizado",
      "Suporte 24h",
      "Backup automático mensal",
      "Todas as funcionalidades"
    ],
    limitations: []
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

// Helper function to check if user can access a specific feature
export const checkFeatureAccess = (userTier: PlanTier | string | null, feature: keyof typeof PLAN_FEATURES.premium) => {
  return canAccessFeature(userTier, feature);
};

// Helper function to get upgrade message
export const getUpgradeMessage = (requiredPlan: PlanTier) => {
  const planNames = {
    essential: "Essencial",
    professional: "Profissional", 
    premium: "Premium"
  };
  return `Recurso disponível apenas no plano ${planNames[requiredPlan]}`;
};

// Helper function to check professional limit
export const canAddProfessional = (userTier: PlanTier | string | null, currentCount: number) => {
  const plan = getPlanFeatures(userTier);
  return currentCount < plan.maxProfessionals;
};