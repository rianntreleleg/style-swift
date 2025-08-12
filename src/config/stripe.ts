// Configurações do Stripe
export const STRIPE_CONFIG = {
  products: {
    essential: 'prod_SqqVGzUIvJPVpt',
    professional: 'prod_professional', // Substitua pelo ID real
    premium: 'prod_premium' // Substitua pelo ID real
  },
  prices: {
    essential: 2990, // R$ 29,90
    professional: 4390, // R$ 43,90
    premium: 7990 // R$ 79,90
  }
};

// Função para obter o ID do produto por nome
export const getProductId = (planName: string): string => {
  const productId = STRIPE_CONFIG.products[planName as keyof typeof STRIPE_CONFIG.products];
  if (!productId) {
    throw new Error(`Produto não encontrado: ${planName}`);
  }
  return productId;
};

// Função para obter o preço por nome
export const getPrice = (planName: string): number => {
  const price = STRIPE_CONFIG.prices[planName as keyof typeof STRIPE_CONFIG.prices];
  if (!price) {
    throw new Error(`Preço não encontrado: ${planName}`);
  }
  return price;
};
