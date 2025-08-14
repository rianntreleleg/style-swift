import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { CheckCircle2, Scissors, Crown, Zap, Star, ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { supabase } from "@/integrations/supabase/client";
import { getProductId } from "@/config/stripe";
import { toast } from "@/hooks/use-toast";
import { THEMES, applyTheme } from "@/config/themes";

const plans = [
  {
    id: "essential",
    name: "Essencial", 
    price: "R$ 29,90",
    description: "Para quem está começando e quer simplicidade.",
    icon: Zap,
    features: [
      "Dashboard comum",
      "Agendamentos do dia e histórico",
      "Serviços ilimitados",
      "1 profissional cadastrado",
      "Página pública"
    ],
    limitations: [
      "Sem dashboard financeiro",
      "Sem lembrete automático 1h antes",
      "Sem suporte"
    ]
  },
  {
    id: "professional",
    name: "Profissional",
    price: "R$ 43,90", 
    description: "Ideal para negócios em crescimento.",
    icon: Star,
    features: [
      "Dashboard financeiro + todas as funções do Essencial",
      "Até 3 profissionais cadastrados",
      "Lembrete automático 1h antes + e-mail de confirmação",
      "Tema personalizado",
      "Suporte completo"
    ],
    limitations: [
      "Sem relatórios avançados",
      "Sem robô de atendimento 24h"
    ],
    popular: true
  },
  {
    id: "premium",
    name: "Premium",
    price: "R$ 79,90",
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
    limitations: []
  }
];

export default function PreAuth() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string>("professional");
  const [selectedTheme, setSelectedTheme] = useState<string>("barber");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Aplicar tema selecionado para prévia
    applyTheme(selectedTheme as any);
  }, [selectedTheme]);

  const handleProceedToPayment = async () => {
    if (!selectedPlan) {
      toast({
        title: "Selecione um plano",
        description: "Você precisa escolher um plano para continuar.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Salvar seleções no localStorage
      localStorage.setItem('planSelected', selectedPlan);
      localStorage.setItem('themeSelected', selectedTheme);
      
      const productId = getProductId(selectedPlan);
      
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { productId }
      });
      
      if (error) {
        throw new Error(error.message || 'Erro na função');
      }
      
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('URL de checkout não recebida');
      }
    } catch (e: any) {
      console.error('Checkout error:', e);
      toast({ 
        title: 'Erro ao iniciar pagamento', 
        description: e.message || 'Erro desconhecido. Tente novamente.', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center">
              <Scissors className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold">StyleSwift</h1>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Escolha seu plano e comece agora
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Primeiro o pagamento, depois o cadastro. Simples e seguro.
          </p>
        </motion.div>

        {/* Seletor de tema */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-md mx-auto mb-8"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Escolha seu tema</CardTitle>
              <CardDescription className="text-center">
                O tema será aplicado ao seu dashboard e página de agendamentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedTheme} onValueChange={setSelectedTheme}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(THEMES).map(([key, theme]) => (
                    <SelectItem key={key} value={key}>
                      {theme.name} - {theme.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </motion.div>

        {/* Planos */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto mb-12"
        >
          {plans.map((plan, index) => {
            const IconComponent = plan.icon;
            const isSelected = selectedPlan === plan.id;
            
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative"
              >
                <Card 
                  className={`cursor-pointer transition-all duration-300 hover:shadow-xl ${
                    plan.popular 
                      ? 'ring-2 ring-primary bg-gradient-to-br from-primary/5 to-primary/10' 
                      : 'hover:shadow-primary/10'
                  } ${
                    isSelected 
                      ? 'ring-2 ring-primary scale-105 shadow-xl' 
                      : ''
                  }`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground px-3 py-1">
                        Mais Popular
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pb-2 pt-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <IconComponent className="h-6 w-6 text-primary-foreground" />
                    </div>
                    
                    <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    
                    <div className="pt-4">
                      <div className="text-3xl font-bold text-primary">
                        {plan.price}
                      </div>
                      <p className="text-sm text-muted-foreground">por mês</p>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {plan.limitations && (
                      <div className="border-t pt-4">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Limitações:</p>
                        {plan.limitations.map((limitation, i) => (
                          <p key={i} className="text-xs text-muted-foreground">• {limitation}</p>
                        ))}
                      </div>
                    )}

                    {isSelected && (
                      <div className="bg-primary/10 p-3 rounded-lg">
                        <p className="text-sm font-medium text-primary text-center">
                          ✓ Plano Selecionado
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Botão de prosseguir */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-center"
        >
          <Button
            onClick={handleProceedToPayment}
            disabled={loading || !selectedPlan}
            size="lg"
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {loading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"
                />
                Processando...
              </>
            ) : (
              <>
                Prosseguir para Pagamento
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          <p className="text-sm text-muted-foreground mt-4">
            Após o pagamento, você poderá criar sua conta e acessar o painel
          </p>
        </motion.div>
      </div>
    </div>
  );
}