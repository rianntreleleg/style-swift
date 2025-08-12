import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, ArrowRight, Building2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

export default function Success() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!sessionId) {
        setError("ID da sessão não encontrado");
        setLoading(false);
        return;
      }

      try {
        // Check subscription status after successful payment
        const { data, error } = await supabase.functions.invoke('check-subscription', {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        });

        if (error) {
          console.error('Error checking subscription:', error);
          setError("Erro ao verificar assinatura");
        }

        console.log('Subscription check result:', data);
      } catch (err) {
        console.error('Error:', err);
        setError("Erro interno");
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [sessionId]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <Loader2 className="h-16 w-16 text-primary mx-auto mb-4 animate-spin" />
          <h2 className="text-2xl font-bold mb-2">Processando pagamento...</h2>
          <p className="text-muted-foreground">Aguarde enquanto confirmamos sua assinatura</p>
        </motion.div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-md mx-auto px-4"
        >
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="text-destructive">Erro no Pagamento</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Houve um problema ao processar seu pagamento. Por favor, tente novamente ou entre em contato conosco.
              </p>
              <div className="flex gap-2">
                <Button asChild variant="outline" className="flex-1">
                  <Link to="/admin">Voltar</Link>
                </Button>
                <Button asChild className="flex-1">
                  <Link to="/admin">Tentar Novamente</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md mx-auto"
      >
        <Card className="border-0 shadow-2xl bg-background/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </motion.div>
            <CardTitle className="text-2xl font-bold text-green-600 dark:text-green-400">
              Pagamento Confirmado!
            </CardTitle>
            <CardDescription className="text-base">
              Sua assinatura foi ativada com sucesso
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 pt-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Agora você pode cadastrar sua barbearia/salão e começar a receber agendamentos online!
              </p>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">Próximos passos:</h4>
                <ul className="text-xs text-muted-foreground space-y-1 text-left">
                  <li>• Configure sua barbearia/salão</li>
                  <li>• Cadastre seus serviços e preços</li>
                  <li>• Adicione profissionais ao seu time</li>
                  <li>• Compartilhe o link de agendamento</li>
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              <Button asChild className="w-full h-12">
                <Link to="/admin" className="flex items-center justify-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Acessar Painel Admin
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              
              <p className="text-xs text-center text-muted-foreground">
                Sua assinatura será renovada automaticamente todos os meses.
                Você pode gerenciar sua assinatura no painel administrativo.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}