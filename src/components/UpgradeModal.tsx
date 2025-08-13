import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, Star, Loader2, X } from "lucide-react";
import { motion } from "framer-motion";
import { useSubscription } from "@/hooks/useSubscription";
import { formatBRL } from "@/lib/utils";
import { PLAN_FEATURES } from "@/config/plans";
import { getProductId } from "@/config/stripe";
import { toast } from "@/hooks/use-toast";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
  currentTier?: string | null;
}

const planIcons = {
  essential: Zap,
  professional: Star, 
  premium: Crown
};

export default function UpgradeModal({ isOpen, onClose, feature, currentTier }: UpgradeModalProps) {
  const { createCheckout } = useSubscription();
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
      const checkoutUrl = await createCheckout(planId);
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
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

  const availablePlans = Object.entries(PLAN_FEATURES).filter(([key]) => key !== 'essential');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <Crown className="h-6 w-6 text-primary" />
                Upgrade Necessário
              </DialogTitle>
              <DialogDescription className="text-base mt-2">
                A funcionalidade <strong>"{feature}"</strong> não está disponível no seu plano atual.
                Escolha um plano que inclui esta funcionalidade:
              </DialogDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2 mt-6">
          {availablePlans.map(([planId, plan], index) => {
            const IconComponent = planIcons[planId as keyof typeof planIcons];
            const isCurrentPlan = currentTier === planId;
            const isLoading = loadingPlan === planId;
            const isPopular = planId === 'professional';
            
            return (
              <motion.div
                key={planId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className={`relative border-2 transition-all duration-300 hover:shadow-xl ${
                  isPopular 
                    ? 'border-primary bg-gradient-to-br from-primary/5 to-primary/10 shadow-lg' 
                    : 'border-border hover:border-primary/50'
                } ${isCurrentPlan ? 'border-green-500 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20' : ''}`}>
                  
                  {isPopular && (
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
                      onClick={() => handleSelectPlan(planId)}
                      disabled={isCurrentPlan || isLoading}
                      className={`w-full h-12 ${
                        isPopular 
                          ? 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70' 
                          : ''
                      }`}
                      variant={isPopular ? 'default' : 'outline'}
                    >
                      {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {isCurrentPlan ? 'Plano Atual' : 'Fazer Upgrade'}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div className="text-center mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            Cancele a qualquer momento • Suporte 24/7 • Sem taxa de setup
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}