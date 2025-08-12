import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getProductId } from "@/config/stripe";

const plans = [
  {
    id: "essential",
    name: "Essencial",
    price: "R$ 29,90",
    description: "Ideal para quem está começando",
    features: [
      "1 profissional",
      "Página pública",
      "Agendamentos básicos"
    ],
    className: "border border-muted shadow-lg",
    buttonVariant: "default" as const
  },
  {
    id: "professional",
    name: "Profissional",
    price: "R$ 43,90",
    description: "Feito para crescer sem dor de cabeça",
    features: [
      "Até 3 profissionais",
      "Dashboard financeiro",
      "Suporte prioritário"
    ],
    className: "relative border-2 border-primary shadow-xl bg-gradient-to-b from-primary/5 to-background",
    buttonVariant: "default" as const,
    badge: "MAIS VENDIDO",
    popular: true
  },
  {
    id: "premium",
    name: "Premium",
    price: "R$ 79,90",
    description: "Seu negócio no piloto automático",
    features: [
      "Profissionais ilimitados",
      "Relatórios avançados",
      "Recursos premium"
    ],
    className: "relative border border-muted shadow-lg bg-muted/10",
    buttonVariant: "outline" as const,
    badge: "TUDO INCLUÍDO"
  }
];

interface PricingSectionProps {
  loadingPlan: string | null;
  startCheckout: (productId: string) => Promise<void>;
}

const PricingSection = ({ loadingPlan, startCheckout }: PricingSectionProps) => {
  return (
    <section id="planos" className="container py-20">
      <motion.div
        className="text-center mb-16"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <h2 className="text-4xl md:text-5xl font-bold mb-6">Escolha seu plano</h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Assine para continuar e liberar seu painel</p>
      </motion.div>

      <motion.div
        className="grid gap-8 md:grid-cols-3"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        viewport={{ once: true }}
      >
        {plans.map((plan) => (
          <Card key={plan.id} className={`${plan.className} flex flex-col`}>
            {plan.badge && (
              <div className="absolute -top-3 right-4 bg-primary text-primary-foreground text-xs font-semibold px-2 py-1 rounded">
                {plan.badge}
              </div>
            )}
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-4xl font-bold">
                {plan.price}
                <span className="text-base font-medium text-muted-foreground">/mês</span>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button 
                disabled={!!loadingPlan} 
                onClick={() => startCheckout(getProductId(plan.id))} 
                className={`w-full ${plan.popular ? 'bg-primary' : ''}`}
                variant={plan.buttonVariant}
              >
                {loadingPlan === getProductId(plan.id) ? 'Carregando...' : 'Selecionar Plano'}
              </Button>
              <p className="text-xs text-muted-foreground text-center">{plan.description}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>
    </section>
  );
};

export default PricingSection;