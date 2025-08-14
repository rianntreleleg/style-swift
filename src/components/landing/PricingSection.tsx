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
      "1 estabelecimento",
      "Agendamentos básicos",
      "Página pública"
    ],
    className: "border border-muted shadow-lg hover:shadow-xl transition-all duration-300",
    buttonVariant: "outline" as const,
    limitations: [
      "Sem dashboard financeiro",
      "Sem temas personalizados",
      "Sem suporte"
    ]
  },
  {
    id: "professional", 
    name: "Profissional",
    price: "R$ 43,90",
    description: "Feito para crescer sem dor de cabeça",
    features: [
      "Até 3 profissionais",
      "1 estabelecimento",
      "Dashboard financeiro básico",
      "Tema personalizado",
      "Suporte incluído"
    ],
    className: "relative border-2 border-primary shadow-xl bg-gradient-to-b from-primary/5 to-background hover:shadow-2xl transition-all duration-300",
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
      "Até 3 estabelecimentos",
      "Relatórios financeiros completos",
      "Robô de IA para atendimento",
      "Suporte prioritário 24/7"
    ],
    className: "relative border border-muted shadow-lg bg-gradient-to-b from-background to-muted/10 hover:shadow-xl transition-all duration-300",
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
    <section id="planos" className="container py-12 lg:py-20 px-4 lg:px-0">
      <motion.div
        className="text-center mb-16"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold mb-4 lg:mb-6">Escolha seu plano</h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Assine para continuar e liberar seu painel</p>
      </motion.div>

      <motion.div
        className="grid gap-6 lg:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
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
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button 
                disabled={!!loadingPlan} 
                onClick={() => startCheckout(getProductId(plan.id))} 
                className={`w-full h-12 transition-all duration-300 ${
                  plan.popular 
                    ? 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl' 
                    : 'hover:shadow-md'
                }`}
                variant={plan.buttonVariant}
              >
                {loadingPlan === getProductId(plan.id) ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"
                    />
                    Processando...
                  </>
                ) : (
                  'Escolher Plano'
                )}
              </Button>
              
              {plan.limitations && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Limitações:</p>
                  {plan.limitations.map((limitation, i) => (
                    <p key={i} className="text-xs text-muted-foreground">• {limitation}</p>
                  ))}
                </div>
              )}
              
              <p className="text-xs text-muted-foreground text-center mt-3">
                Cancele a qualquer momento
              </p>
            </CardContent>
          </Card>
        ))}
      </motion.div>
    </section>
  );
};

export default PricingSection;