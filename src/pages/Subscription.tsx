import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Crown, CreditCard, X, ArrowLeft, ExternalLink } from "lucide-react";

interface TenantSubscription {
  id: string;
  name: string;
  plan_tier: string;
  plan_status: string;
  payment_completed: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
}

export default function Subscription() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<TenantSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchTenantSubscription();
  }, [user, navigate]);

  const fetchTenantSubscription = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, plan_tier, plan_status, payment_completed, stripe_customer_id, stripe_subscription_id, current_period_start, current_period_end')
        .eq('owner_id', user.id)
        .single();

      if (error) throw error;
      setTenant(data);
    } catch (error: any) {
      console.error('Erro ao carregar assinatura:', error);
      toast({
        title: 'Erro ao carregar dados da assinatura',
        description: error.message || 'Ocorreu um erro ao carregar as informações da sua assinatura. Por favor, tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!tenant?.stripe_subscription_id) {
      toast({
        title: 'Erro ao cancelar assinatura',
        description: 'Não foi possível identificar o ID da assinatura. Por favor, entre em contato com o suporte.',
        variant: 'destructive'
      });
      return;
    }

    setCanceling(true);
    try {
      // Chamar função para cancelar no Stripe
      const { error } = await supabase.functions.invoke('cancel-subscription', {
        body: { 
          subscriptionId: tenant.stripe_subscription_id,
          tenantId: tenant.id 
        }
      });

      if (error) throw error;

      toast({
        title: 'Assinatura cancelada com sucesso!',
        description: 'Sua assinatura foi cancelada. Você continuará tendo acesso completo até o final do período pago atual.'
      });

      // Atualizar dados locais
      await fetchTenantSubscription();
    } catch (error: any) {
      console.error('Erro ao cancelar assinatura:', error);
      toast({
        title: 'Erro ao cancelar assinatura',
        description: error.message || 'Ocorreu um erro ao processar o cancelamento da assinatura. Por favor, tente novamente ou entre em contato com o suporte.',
        variant: 'destructive'
      });
    } finally {
      setCanceling(false);
    }
  };

  const openStripePortal = async () => {
    if (!tenant?.stripe_customer_id) {
      toast({
        title: 'Erro ao acessar portal do cliente',
        description: 'Não foi possível identificar o ID do cliente. Por favor, entre em contato com o suporte.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        body: { customerId: tenant.stripe_customer_id }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      console.error('Erro ao abrir portal:', error);
      toast({
        title: 'Erro ao acessar portal de pagamento',
        description: 'Não foi possível abrir o portal de pagamento. Por favor, tente novamente ou entre em contato com o suporte.',
        variant: 'destructive'
      });
    }
  };

  const getPlanDetails = (planTier: string) => {
    switch (planTier) {
      case 'essential':
        return { name: 'Essencial', price: 'R$ 29,90/mês', color: 'secondary' };
      case 'professional':
        return { name: 'Profissional', price: 'R$ 43,90/mês', color: 'default' };
      case 'premium':
        return { name: 'Premium', price: 'R$ 79,90/mês', color: 'default' };
      default:
        return { name: 'Gratuito', price: 'R$ 0/mês', color: 'outline' };
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando dados da assinatura...</p>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">Nenhuma assinatura encontrada</p>
            <Button onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const planDetails = getPlanDetails(tenant.plan_tier);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Gerenciar Assinatura</h1>
            <p className="text-muted-foreground">Gerencie seu plano e pagamentos</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Informações da Assinatura */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Plano Atual
              </CardTitle>
              <CardDescription>
                Informações detalhadas sobre sua assinatura
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={planDetails.color as any}>
                      {planDetails.name}
                    </Badge>
                    <Badge variant={tenant.payment_completed && tenant.plan_status === 'active' ? 'default' : 'destructive'}>
                      {tenant.payment_completed && tenant.plan_status === 'active' ? 'Ativo' : 'Cancelado/Inativo'}
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold">{planDetails.price}</p>
                  <p className="text-sm text-muted-foreground">
                    Estabelecimento: {tenant.name}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={openStripePortal}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Portal do Cliente
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Período Atual</h4>
                  <p className="text-sm text-muted-foreground">
                    Início: {formatDate(tenant.current_period_start)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Fim: {formatDate(tenant.current_period_end)}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Status do Pagamento</h4>
                  <p className="text-sm text-muted-foreground">
                    {tenant.payment_completed ? 'Pago' : 'Pendente'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Status: {tenant.plan_status}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recursos do Plano */}
          <Card>
            <CardHeader>
              <CardTitle>Recursos Inclusos</CardTitle>
              <CardDescription>
                O que está incluído no seu plano {planDetails.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tenant.plan_tier === 'essential' && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Dashboard básico</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">1 profissional</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Serviços ilimitados</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Página pública</span>
                    </div>
                  </>
                )}
                {tenant.plan_tier === 'professional' && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Dashboard financeiro</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Até 3 profissionais</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Lembrete automático</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Suporte completo</span>
                    </div>
                  </>
                )}
                {tenant.plan_tier === 'premium' && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Todos os recursos Professional</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Profissionais ilimitados</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Relatórios avançados</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Integração WhatsApp</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Ações */}
          {tenant.plan_status === 'active' && tenant.payment_completed && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Zona de Perigo</CardTitle>
                <CardDescription>
                  Ações irreversíveis para sua assinatura
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <X className="h-4 w-4 mr-2" />
                      Cancelar Assinatura
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Tem certeza que deseja cancelar?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação cancelará sua assinatura. Você continuará tendo acesso aos recursos 
                        até o final do período pago atual ({formatDate(tenant.current_period_end)}), 
                        mas não será cobrado novamente.
                        <br /><br />
                        Após o cancelamento, você perderá acesso a:
                        <br />• Dashboard completo
                        <br />• Criação de agendamentos
                        <br />• Relatórios financeiros
                        <br />• Suporte técnico
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Manter Assinatura</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleCancelSubscription}
                        disabled={canceling}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {canceling ? 'Cancelando...' : 'Sim, Cancelar'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
