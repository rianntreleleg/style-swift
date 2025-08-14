import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Crown, Star, Zap } from "lucide-react";
import { getPlanFeatures, getUpgradeMessage, type PlanTier } from "@/config/plans";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getProductId } from "@/config/stripe";

interface UpgradePromptProps {
  requiredPlan: PlanTier;
  featureName: string;
  currentPlan?: string | null;
  onUpgrade?: () => void;
}

const planIcons = {
  essential: Zap,
  professional: Star,
  premium: Crown
};

const planColors = {
  essential: "bg-blue-500",
  professional: "bg-purple-500", 
  premium: "bg-yellow-500"
};

export default function UpgradePrompt({ 
  requiredPlan, 
  featureName, 
  currentPlan,
  onUpgrade 
}: UpgradePromptProps) {
  const plan = getPlanFeatures(requiredPlan);
  const IconComponent = planIcons[requiredPlan];
  const planColor = planColors[requiredPlan];

  const handleUpgrade = async () => {
    try {
      const productId = getProductId(requiredPlan);
      
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { productId }
      });
      
      if (error) {
        console.error('Function error:', error);
        throw new Error(error.message || 'Erro na function');
      }
      
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('URL de checkout não recebida');
      }
    } catch (e: any) {
      console.error('Upgrade error:', e);
      toast({ 
        title: 'Erro ao iniciar upgrade', 
        description: e.message || 'Erro desconhecido. Tente novamente.', 
        variant: 'destructive' 
      });
    }
  };

  return (
    <Card className="border-2 border-dashed border-muted-foreground/20 bg-muted/10">
      <CardHeader className="text-center pb-4">
        <div className="w-16 h-16 bg-gradient-to-br from-muted-foreground/20 to-muted-foreground/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <CardTitle className="text-xl font-semibold text-muted-foreground">
          {featureName}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {getUpgradeMessage(requiredPlan)}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Current vs Required Plan */}
        <div className="flex items-center justify-between p-4 bg-background rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-muted-foreground">
                {currentPlan?.charAt(0).toUpperCase() || 'E'}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium">Seu plano atual</p>
              <p className="text-xs text-muted-foreground">
                {currentPlan ? getPlanFeatures(currentPlan).name : 'Essencial'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {currentPlan || 'essential'}
            </Badge>
          </div>
        </div>

        {/* Required Plan */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 ${planColor} rounded-full flex items-center justify-center`}>
              <IconComponent className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium">Plano necessário</p>
              <p className="text-xs text-muted-foreground">
                {plan.name} - R$ {(plan.price / 100).toFixed(2).replace('.', ',')}/mês
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className="text-xs bg-primary">
              {requiredPlan}
            </Badge>
          </div>
        </div>

        {/* Plan Features */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-center">O que você ganha com o {plan.name}:</p>
          <ul className="space-y-2">
            {plan.features.slice(0, 3).map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Upgrade Button */}
        <Button 
          onClick={onUpgrade || handleUpgrade}
          className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
        >
          <Crown className="h-4 w-4 mr-2" />
          Fazer Upgrade para {plan.name}
        </Button>
        
        <p className="text-xs text-muted-foreground text-center">
          Cancele a qualquer momento • Sem taxa de cancelamento
        </p>
      </CardContent>
    </Card>
  );
}
