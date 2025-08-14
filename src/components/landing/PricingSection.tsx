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
  BarChart3,
  Settings,
  Bot,
  Headphones,
  ArrowRight,
  Sparkles
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
    color: 'from-blue-500 to-blue-600',
    bgColor: 'from-blue-50 to-blue-100',
    borderColor: 'border-blue-200',
    features: [
      { text: 'Dashboard comum', included: true },
      { text: 'Agendamentos do dia e histórico', included: true },
      { text: 'Serviços ilimitados', included: true },
      { text: '1 profissional cadastrado', included: true },
      { text: 'Página pública', included: true },
      { text: 'Envio de e-mail de confirmação', included: false, plan: 'professional' },
      { text: 'Envio de lembrete automático 1h antes', included: false, plan: 'premium' },
      { text: 'Dashboard financeiro', included: false, plan: 'professional' },
      { text: 'Tema personalizado', included: false, plan: 'professional' },
      { text: 'Suporte completo', included: false, plan: 'professional' },
      { text: 'Relatórios avançados', included: false, plan: 'premium' },
      { text: 'Robô de atendimento 24h', included: false, plan: 'premium' },
      { text: 'Profissionais ilimitados', included: false, plan: 'premium' },
      { text: 'Suporte 24h', included: false, plan: 'premium' }
    ],
    limitations: [
      'Sem dashboard financeiro',
      'Sem lembrete automático 1h antes',
      'Sem suporte'
    ]
  },
  {
    id: 'professional',
    name: 'Profissional',
    price: 43.90,
    description: 'Mais Popular',
    icon: Star,
    color: 'from-purple-500 to-purple-600',
    bgColor: 'from-purple-50 to-purple-100',
    borderColor: 'border-purple-200',
    popular: true,
    features: [
      { text: 'Dashboard financeiro + todas as funções do Essencial', included: true },
      { text: 'Até 3 profissionais cadastrados', included: true },
      { text: 'Lembrete automático 1h antes + e-mail de confirmação', included: true },
      { text: 'Tema personalizado', included: true },
      { text: 'Suporte completo', included: true },
      { text: 'Relatórios avançados', included: false, plan: 'premium' },
      { text: 'Robô de atendimento 24h', included: false, plan: 'premium' },
      { text: 'Profissionais ilimitados', included: false, plan: 'premium' },
      { text: 'Suporte 24h', included: false, plan: 'premium' }
    ],
    limitations: [
      'Sem relatórios avançados',
      'Sem robô de atendimento 24h'
    ]
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 79.90,
    description: 'Solução completa',
    icon: Crown,
    color: 'from-yellow-500 to-orange-500',
    bgColor: 'from-yellow-50 to-orange-100',
    borderColor: 'border-yellow-200',
    features: [
      { text: 'Dashboard financeiro', included: true },
      { text: 'Relatórios completos', included: true },
      { text: 'Profissionais ilimitados', included: true },
      { text: 'Robô de atendimento 24h', included: true },
      { text: 'Lembrete automático 1h antes', included: true },
      { text: 'E-mail de confirmação', included: true },
      { text: 'Tema personalizado', included: true },
      { text: 'Suporte 24h', included: true },
      { text: 'Todas as funcionalidades', included: true }
    ],
    limitations: []
  }
];

const planIcons = {
  essential: Zap,
  professional: Star,
  premium: Crown
};

const planColors = {
  essential: 'text-blue-600',
  professional: 'text-purple-600',
  premium: 'text-yellow-600'
};

export default function PricingSection({ loadingPlan, startCheckout }: PricingSectionProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handlePlanSelect = async (planId: string) => {
    setSelectedPlan(planId);
    await startCheckout(planId);
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
        ease: "easeOut"
      }
    },
    hover: {
      y: -10,
      transition: {
        duration: 0.3,
        ease: "easeOut"
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
    <section id="pricing" className="py-20 bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Escolha o Plano Ideal
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
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
                    <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 text-sm font-semibold shadow-lg">
                      <Sparkles className="h-4 w-4 mr-1" />
                      Mais Popular
                    </Badge>
                  </motion.div>
                )}

                <Card className={`h-full relative overflow-hidden border-2 ${plan.borderColor} bg-gradient-to-br ${plan.bgColor} hover:shadow-2xl transition-all duration-300 ${
                  plan.popular ? 'ring-2 ring-purple-500/20 scale-105' : ''
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
                    
                    <CardTitle className="text-2xl font-bold mb-2">{plan.name}</CardTitle>
                    <CardDescription className="text-lg">{plan.description}</CardDescription>
                    
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4, duration: 0.5 }}
                      className="mt-4"
                    >
                      <div className="text-4xl font-bold">
                        R$ {plan.price.toFixed(2).replace('.', ',')}
                        <span className="text-lg font-normal text-muted-foreground">/mês</span>
                      </div>
                    </motion.div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Features */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-lg mb-4">Funcionalidades Inclusas:</h4>
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
                              <TooltipContent side="right" className="max-w-xs">
                                <div className="space-y-2">
                                  <p className="font-semibold">Disponível no plano {feature.plan}</p>
                                  <p className="text-sm text-muted-foreground">
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
                          <span className={`text-sm ${feature.included ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                            {feature.text}
                          </span>
                        </motion.div>
                      ))}
                    </div>

                    {/* Limitations */}
                    {plan.limitations.length > 0 && (
                      <div className="space-y-3 pt-4 border-t">
                        <h4 className="font-semibold text-lg text-muted-foreground">Limitações:</h4>
                        {plan.limitations.map((limitation, limitationIndex) => (
                          <motion.div
                            key={limitationIndex}
                            variants={featureVariants}
                            className="flex items-center gap-3"
                          >
                            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <X className="h-3 w-3 text-white" />
                            </div>
                            <span className="text-sm text-muted-foreground">{limitation}</span>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {/* CTA Button */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6, duration: 0.5 }}
                      className="pt-4"
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
                      <p className="text-xs text-muted-foreground">
                        Cancele a qualquer momento • Sem taxa de cancelamento
                      </p>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </TooltipProvider>

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="mt-20"
        >
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4">Comparação Detalhada</h3>
            <p className="text-muted-foreground">
              Veja exatamente o que cada plano oferece
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-semibold">Funcionalidade</th>
                  <th className="text-center p-4 font-semibold">Essencial</th>
                  <th className="text-center p-4 font-semibold bg-purple-50">Profissional</th>
                  <th className="text-center p-4 font-semibold bg-yellow-50">Premium</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-4 font-medium">Dashboard comum</td>
                  <td className="text-center p-4"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                  <td className="text-center p-4 bg-purple-50"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                  <td className="text-center p-4 bg-yellow-50"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium">Dashboard financeiro</td>
                  <td className="text-center p-4"><X className="h-5 w-5 text-red-500 mx-auto" /></td>
                  <td className="text-center p-4 bg-purple-50"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                  <td className="text-center p-4 bg-yellow-50"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium">E-mail de confirmação</td>
                  <td className="text-center p-4"><X className="h-5 w-5 text-red-500 mx-auto" /></td>
                  <td className="text-center p-4 bg-purple-50"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                  <td className="text-center p-4 bg-yellow-50"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium">Lembrete 1h antes</td>
                  <td className="text-center p-4"><X className="h-5 w-5 text-red-500 mx-auto" /></td>
                  <td className="text-center p-4 bg-purple-50"><X className="h-5 w-5 text-red-500 mx-auto" /></td>
                  <td className="text-center p-4 bg-yellow-50"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium">Profissionais</td>
                  <td className="text-center p-4">1</td>
                  <td className="text-center p-4 bg-purple-50">3</td>
                  <td className="text-center p-4 bg-yellow-50">Ilimitados</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium">Suporte</td>
                  <td className="text-center p-4">Básico</td>
                  <td className="text-center p-4 bg-purple-50">Completo</td>
                  <td className="text-center p-4 bg-yellow-50">24h</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium">Robô de atendimento</td>
                  <td className="text-center p-4"><X className="h-5 w-5 text-red-500 mx-auto" /></td>
                  <td className="text-center p-4 bg-purple-50"><X className="h-5 w-5 text-red-500 mx-auto" /></td>
                  <td className="text-center p-4 bg-yellow-50"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  );
}