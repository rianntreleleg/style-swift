import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { CreditCard, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getProductId } from "@/config/stripe";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

interface PaymentRequiredProps {
  planTier: string;
}

export const PaymentRequired = ({ planTier }: PaymentRequiredProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const getPlanName = (tier: string) => {
    switch (tier) {
      case 'professional':
        return 'Profissional';
      case 'premium':
        return 'Premium';
      default:
        return 'Essencial';
    }
  };

  const handleProceedToPayment = async () => {
    setLoading(true);
    try {
      // Buscar dados do usuário atual e tenant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      // Buscar tenant do usuário
      const { data: tenants, error: tenantError } = await supabase
        .from('tenants')
        .select('id, stripe_customer_id, plan_tier')
        .eq('owner_id', user.id)
        .eq('plan_tier', planTier)
        .single();

      if (tenantError || !tenants) {
        throw new Error('Estabelecimento não encontrado');
      }

      if (!tenants.stripe_customer_id) {
        throw new Error('Customer do Stripe não encontrado');
      }

      const productId = getProductId(planTier);

      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-checkout-session', {
        body: { 
          productId,
          customerId: tenants.stripe_customer_id,
          tenantId: tenants.id,
          userEmail: user.email
        }
      });
      
      if (checkoutError) {
        throw new Error(checkoutError.message || 'Erro na função de checkout');
      }
      
      if (checkoutData?.url) {
        window.location.href = checkoutData.url;
      } else {
        throw new Error('URL de checkout não recebida');
      }
    } catch (error: any) {
      console.error('Erro ao processar pagamento:', error);
      toast({ 
        title: 'Erro ao iniciar pagamento', 
        description: error.message || 'Erro desconhecido. Tente novamente.', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <CreditCard className="h-6 w-6 text-primary" />
              Pagamento Pendente
            </CardTitle>
            <CardDescription className="text-base">
              Complete o pagamento para acessar o plano {getPlanName(planTier)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h3 className="font-medium">Status do Plano</h3>
              <p className="text-sm text-muted-foreground">
                Você selecionou o plano {getPlanName(planTier)}, mas o pagamento ainda não foi confirmado.
                Para acessar todos os recursos, complete o processo de pagamento.
              </p>
            </div>

            <div className="space-y-4">
              <Button 
                onClick={handleProceedToPayment}
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                {loading ? 'Redirecionando...' : 'Completar Pagamento'}
              </Button>

              <Button 
                variant="outline"
                onClick={() => navigate('/auth')}
                className="w-full"
                disabled={loading}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Fazer Logout
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Após a confirmação do pagamento, você terá acesso imediato a todos os recursos do plano.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
