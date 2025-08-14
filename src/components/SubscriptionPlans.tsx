import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Crown, Zap, Star } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { formatBRL } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const plans = [
  {
    id: "essential",
    name: "Essencial",
    price: 2990, // R$ 29,90 em centavos
    description: "Para quem está começando e quer simplicidade.",
    icon: Zap,
    features: [
      "Dashboard comum",
      "Agendamentos do dia e histórico",
      "Serviços ilimitados",
      "1 profissional cadastrado",
      "Página pública"
    ],
    popular: false
  },
  {
    id: "professional",
    name: "Profissional",
    price: 4390, // R$ 43,90 em centavos
    description: "Ideal para negócios em crescimento.",
    icon: Star,
    features: [
      "Dashboard financeiro + todas as funções do Essencial",
      "Até 3 profissionais cadastrados",
      "Lembrete automático 1h antes + e-mail de confirmação",
      "Tema personalizado",
      "Suporte completo"
    ],
    popular: true
  },
  {
    id: "premium",
    name: "Premium",
    price: 7990, // R$ 79,90 em centavos
    description: "Para máxima performance e automação.",
    icon: Crown,
    features: [
      "Dashboard financeiro",
      "Relatórios completos",
      "Profissionais ilimitados",
      "Robô de atendimento 24h",
      "Lembrete automático 1h antes",
      "E-mail de confirmação",
      "Tema persoalizado",
      "Suporte 24h",
      "Todas as funcionalidades"
    ],
    popular: false
  }
];

interface SubscriptionPlansProps {
  currentTier?: string | null;
}

export default function SubscriptionPlans({ currentTier }: SubscriptionPlansProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSelectPlan = async (planId: string) => {
    if (currentTier === planId) {
      toast({
        title: "Plano atual",
        description: "Você já está usando este plano.",
      });
      return;
    }

    setLoadingPlan(planId);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { planTier: planId },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) {
        console.error('Error creating checkout:', error);
        throw new Error('Erro ao criar checkout');
      }

      if (data?.url) {
        // Open Stripe checkout in a new tab
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Erro ao processar",
        description: "Tente novamente em alguns momentos.",
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {plans.map((plan, index) => {
        const IconComponent = plan.icon;
        const isCurrentPlan = currentTier === plan.id;
        const isLoading = loadingPlan === plan.id;
        
        return (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className={`relative border-0 shadow-lg transition-all duration-300 hover:shadow-xl ${
              plan.popular 
                ? 'ring-2 ring-primary bg-gradient-to-br from-primary/5 to-primary/10' 
                : 'hover:shadow-primary/10'
            } ${isCurrentPlan ? 'ring-2 ring-green-500 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20' : ''}`}>
              
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-3 py-1">
                    Mais Popular
                  </Badge>
                </div>
              )}
              
              {isCurrentPlan && (
                <div className="absolute -top-3 right-4">
                  <Badge className="bg-green-500 text-white px-3 py-1">
                    Plano Atual
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-2 pt-6">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <IconComponent className="h-6 w-6 text-primary-foreground" />
                </div>
                
                <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                <CardDescription className="text-sm">{plan.description}</CardDescription>
                
                <div className="pt-4">
                  <div className="text-3xl font-bold text-primary">
                    {formatBRL(plan.price)}
                  </div>
                  <p className="text-sm text-muted-foreground">por mês</p>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isCurrentPlan || isLoading}
                  className={`w-full h-12 ${
                    plan.popular 
                      ? 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70' 
                      : ''
                  }`}
                  variant={plan.popular ? 'default' : 'outline'}
                >
                  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {isCurrentPlan ? 'Plano Atual' : 'Escolher Plano'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}