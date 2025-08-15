import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Check, 
  X, 
  Crown, 
  Star, 
  Zap, 
  Mail, 
  Clock, 
  Users, 
  BarChart,
  Settings,
  Bot,
  Headphones,
  ArrowRight,
  Sparkles,
  CheckCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PricingSectionProps {
  loadingPlan?: string | null;
  startCheckout: (plan: string) => Promise<void>;
}

const plans = [
  {
    id: 'essential',
    name: 'Essencial',
    price: 29.90,
    description: 'Perfeito para começar',
    icon: Zap,
    color: 'from-blue-600 to-blue-800',
    bgColor: 'from-gray-900 to-black',
    borderColor: 'border-blue-900/50',
    features: [
      { text: 'Dashboard básico', included: true },
      { text: 'Agendamentos do dia + histórico', included: true },
      { text: 'Criação de serviços ilimitados', included: true },
      { text: '1 profissional cadastrado', included: true },
      { text: 'Página pública personalizada', included: true },
      { text: '1 Mês de Suporte Gratuito', included: true },
      { text: 'Envio de e-mail de confirmação para seus clientes', included: false, plan: 'professional' },
      { text: 'Envio de lembrete automático 1h antes do agendamento', included: false, plan: 'premium' },
      { text: 'Dashboard financeiro', included: false, plan: 'professional' }
    ]
  },
  {
    id: 'professional',
    name: 'Profissional',
    price: 43.90,
    description: 'Mais Popular',
    icon: Star,
    color: 'from-purple-600 to-purple-800',
    bgColor: 'from-gray-900 to-black',
    borderColor: 'border-purple-900/50',
    popular: true,
    features: [
      { text: 'Dashboard financeiro + todas as funções do Essencial', included: true },
      { text: 'Até 3 profissionais cadastrados', included: true },
      { text: 'Lembrete automático 1h antes + e-mail de confirmação', included: true },
      { text: 'Tema personalizado', included: true },
      { text: 'Suporte completo', included: true },
      { text: 'Relatórios avançados', included: false, plan: 'premium' },
      { text: 'Profissionais ilimitados', included: false, plan: 'premium' },
      { text: 'Suporte 24h', included: false, plan: 'premium' }
    ]
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 79.90,
    description: 'Solução completa',
    icon: Crown,
    color: 'from-yellow-600 to-orange-600',
    bgColor: 'from-gray-900 to-black',
    borderColor: 'border-yellow-900/50',
    features: [
      { text: 'Dashboard financeiro', included: true },
      { text: 'Relatórios completos', included: true },
      { text: 'Profissionais ilimitados', included: true },
      { text: 'Lembrete automático 1h antes do agendamento', included: true },
      { text: 'E-mail de confirmação', included: true },
      { text: 'Integrações avançadas com ferramentas externas', included: true },
      { text: 'Tema personalizado (logo, cores, etc)', included: true },
      { text: 'Suporte prioritário 24h', included: true },
      { text: 'Todas as outras funcionalidades', included: true }
    ]
  }
];

const planIcons = {
  essential: Zap,
  professional: Star,
  premium: Crown
};

const planColors = {
  essential: 'text-blue-400',
  professional: 'text-purple-400',
  premium: 'text-yellow-400'
};

const faqs = [
  {
    question: "Posso mudar de plano a qualquer momento?",
    answer: "Sim, você pode fazer upgrade ou downgrade do seu plano a qualquer momento. As mudanças são aplicadas imediatamente."
  },
  {
    question: "Há algum custo adicional além da mensalidade?",
    answer: "Não, nosso preço é transparente. O valor exibido já inclui todas as funcionalidades do plano escolhido."
  },
  {
    question: "Como funciona o período de teste?",
    answer: "Todos os planos incluem 14 dias de teste gratuito. Você pode cancelar a qualquer momento sem compromisso."
  }
];

export default function PricingSection({ loadingPlan, startCheckout }: PricingSectionProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handlePlanSelect = async (planId: string) => {
    setSelectedPlan(planId);
    await startCheckout(planId);
  };

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.2
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut" as const
      }
    },
    hover: {
      y: -10,
      transition: {
        duration: 0.3,
        ease: "easeOut" as const
      }
    }
  };

  const featureVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.4
      }
    }
  };

  return (
    <section id="pricing" className="py-20 bg-black text-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 px-4 py-2">
            <Sparkles className="w-4 h-4 mr-2" />
            Planos que crescem com o seu negócio
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Escolha o Plano Ideal
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Comece gratuitamente e faça upgrade conforme seu negócio cresce. 
            Todos os planos incluem funcionalidades essenciais para gerenciar seu estabelecimento.
          </p>
        </motion.div>

        <TooltipProvider>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto"
          >
            {plans.map((plan, index) => (
              <motion.div
                key={plan.id}
                variants={cardVariants}
                whileHover="hover"
                className="relative"
              >
                {plan.popular && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10"
                  >
                    <Badge className="bg-gradient-to-r from-purple-600 to-purple-800 text-white px-4 py-2 text-sm font-semibold shadow-lg">
                      <Sparkles className="h-4 w-4 mr-1" />
                      Mais Popular
                    </Badge>
                  </motion.div>
                )}

                <Card className={`h-full flex flex-col relative overflow-hidden border-2 ${plan.borderColor} bg-gradient-to-br from-gray-900 to-black hover:shadow-2xl transition-all duration-300 ${
                  plan.popular ? 'ring-2 ring-purple-500/30 scale-105' : ''
                }`}>
                  <CardHeader className="text-center pb-6">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                      className={`w-16 h-16 bg-gradient-to-br ${plan.color} rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg`}
                    >
                      <plan.icon className="h-8 w-8 text-white" />
                    </motion.div>
                    
                    <CardTitle className="text-2xl font-bold mb-2 text-white">{plan.name}</CardTitle>
                    <CardDescription className="text-lg text-gray-300">{plan.description}</CardDescription>
                    
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4, duration: 0.5 }}
                      className="mt-4"
                    >
                      <div className="text-4xl font-bold text-white">
                        R$ {plan.price.toFixed(2).replace('.', ',')}
                        <span className="text-lg font-normal text-gray-400">/mês</span>
                      </div>
                    </motion.div>
                  </CardHeader>

                  <CardContent className="flex flex-col h-full">
                    {/* Features */}
                    <div className="flex-grow space-y-3 mb-4">
                      <h4 className="font-semibold text-lg mb-4 text-white">Funcionalidades Inclusas:</h4>
                      {plan.features.map((feature, featureIndex) => (
                        <motion.div
                          key={featureIndex}
                          variants={featureVariants}
                          className="flex items-center gap-3"
                        >
                          {feature.included ? (
                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 cursor-help">
                                  <X className="h-3 w-3 text-white" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs bg-gray-800 border border-gray-700">
                                <div className="space-y-2">
                                  <p className="font-semibold text-white">Disponível no plano {feature.plan}</p>
                                  <p className="text-sm text-gray-300">
                                    {feature.text === 'Envio de e-mail de confirmação' && 
                                      'Envie e-mails automáticos de confirmação para seus clientes quando agendarem um horário.'}
                                    {feature.text === 'Envio de lembrete automático 1h antes' && 
                                      'Envie lembretes automáticos 1 hora antes do agendamento para reduzir faltas.'}
                                    {feature.text === 'Dashboard financeiro' && 
                                      'Acompanhe sua receita, lucros e performance financeira em tempo real.'}
                                    {feature.text === 'Tema personalizado' && 
                                      'Personalize as cores e estilo da sua página pública.'}
                                    {feature.text === 'Suporte completo' && 
                                      'Receba suporte prioritário para resolver suas dúvidas rapidamente.'}
                                    {feature.text === 'Relatórios avançados' && 
                                      'Acesse relatórios detalhados sobre performance, clientes e tendências.'}
                                    {feature.text === 'Robô de atendimento 24h' && 
                                      'Bot inteligente que atende seus clientes 24 horas por dia.'}
                                    {feature.text === 'Profissionais ilimitados' && 
                                      'Cadastre quantos profissionais precisar sem limitações.'}
                                    {feature.text === 'Suporte 24h' && 
                                      'Suporte disponível 24 horas por dia, 7 dias por semana.'}
                                  </p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <span className={`text-sm ${feature.included ? 'text-white' : 'text-gray-500 line-through'}`}>
                            {feature.text}
                          </span>
                        </motion.div>
                      ))}
                    </div>

                    {/* CTA Button and Additional Info */}
                    <div className="mt-auto space-y-4">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.5 }}
                      >
                        <Button
                          onClick={() => handlePlanSelect(plan.id)}
                          disabled={loadingPlan === plan.id}
                          className={`w-full h-12 bg-gradient-to-r ${plan.color} hover:opacity-90 text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 ${
                            plan.popular ? 'ring-2 ring-purple-500/50' : ''
                          }`}
                        >
                          {loadingPlan === plan.id ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                          ) : (
                            <ArrowRight className="h-5 w-5 mr-2" />
                          )}
                          {plan.id === 'essential' ? 'Começar agora' : 
                           plan.id === 'professional' ? 'Assinar este plano' : 
                           'Garantir minha vaga no Premium'}
                        </Button>
                      </motion.div>

                      {/* Additional Info */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8, duration: 0.5 }}
                        className="text-center"
                      >
                        <p className="text-xs text-gray-500">
                          Cancele a qualquer momento • Sem taxa de cancelamento
                        </p>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </TooltipProvider>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          viewport={{ once: true }}
          className="mt-20 max-w-3xl mx-auto"
        >
          <h3 className="text-2xl font-bold text-center mb-8">Perguntas Frequentes</h3>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index} 
                className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden"
              >
                <button
                  className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-800/50 transition-colors"
                  onClick={() => toggleFaq(index)}
                >
                  <span className="font-medium text-white">{faq.question}</span>
                  <motion.div
                    animate={{ rotate: expandedFaq === index ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </motion.div>
                </button>
                {expandedFaq === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="px-4 pb-4 text-gray-400"
                  >
                    {faq.answer}
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}