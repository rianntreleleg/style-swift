import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Loading } from "@/components/ui/loading";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Scissors,
  User,
  Mail,
  Lock,
  Building2,
  Link,
  Palette,
  CheckCircle2,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { motion } from "framer-motion";
import { useMemo } from "react";

const SignupSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  name: z.string().min(2, "Nome obrigatório"),
  business_name: z.string().min(2, "Nome do estabelecimento obrigatório"),
  logo_url: z.string().url().optional().or(z.literal("")),
  theme_variant: z.enum(["barber", "salon"]).default("barber"),
  open_time: z.string().regex(/^\d{2}:\d{2}$/, "Informe no formato HH:MM"),
  close_time: z.string().regex(/^\d{2}:\d{2}$/, "Informe no formato HH:MM"),
  working_days: z.array(z.number().int().min(0).max(6)).min(1, "Selecione pelo menos um dia"),
});

type SignupForm = z.infer<typeof SignupSchema>;

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const signupForm = useForm<SignupForm>({
    resolver: zodResolver(SignupSchema),
    defaultValues: {
      theme_variant: "barber",
      open_time: "09:00",
      close_time: "18:00",
      working_days: [1,2,3,4,5,6],
    }
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate("/admin");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/admin");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Verificar se há plano selecionado para permitir cadastro
  const planSelected = localStorage.getItem('planSelected');
  const canAccessSignup = !!planSelected;

  // Verificar se veio do checkout de pagamento
  const checkoutSuccess = searchParams.get('checkout') === 'success';
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (checkoutSuccess && sessionId) {
      // Usuário veio do pagamento bem-sucedido
      toast({
        title: "Pagamento realizado com sucesso!",
        description: "Agora você pode criar sua conta.",
      });
      
      // Limpar URL para não mostrar os parâmetros
      navigate('/auth', { replace: true });
    }
  }, [checkoutSuccess, sessionId, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      toast({ title: "Login realizado com sucesso!" });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (values: SignupForm) => {
    if (!canAccessSignup) {
      toast({
        title: "Pagamento necessário",
        description: "Você precisa escolher um plano antes de se cadastrar.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const planSelected = localStorage.getItem('planSelected');
      console.log('[AUTH] Plan selected from localStorage:', planSelected);
      
      // Primeiro cria o usuário
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        console.log('[AUTH] User created:', authData.user.id);
        
        // Gerar slug único baseado no nome do estabelecimento
        const baseSlug = values.business_name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();
        
        // Verificar se o slug já existe e adicionar número se necessário
        let finalSlug = baseSlug;
        let counter = 1;
        while (true) {
          const { data: existingTenant } = await supabase
            .from("tenants")
            .select("id")
            .eq("slug", finalSlug)
            .single();
          
          if (!existingTenant) break;
          finalSlug = `${baseSlug}-${counter}`;
          counter++;
        }

        // Verificar se já existe pagamento para este email
        const { data: existingPayment } = await supabase
          .from("subscribers")
          .select("*")
          .eq("email", values.email)
          .eq("subscribed", true)
          .single();

        console.log('[AUTH] Existing payment found:', existingPayment);

                 // Cria o tenant com informações do plano
         const tenantData = {
           owner_id: authData.user.id,
           name: values.business_name,
           slug: finalSlug,
           theme_variant: values.theme_variant,
           logo_url: values.logo_url || null,
           plan: existingPayment?.subscription_tier || planSelected || 'essential',
           plan_tier: existingPayment?.subscription_tier || planSelected || 'essential',
           plan_status: existingPayment ? 'active' : 'unpaid',
           payment_completed: !!existingPayment,
           stripe_customer_id: existingPayment?.stripe_customer_id || null,
         };

        console.log('[AUTH] Creating tenant with data:', tenantData);

        const { data: tenantRow, error: tenantError } = await supabase
          .from("tenants")
          .insert(tenantData)
          .select("id")
          .single();

        if (tenantError) throw tenantError;

        console.log('[AUTH] Tenant created:', tenantRow?.id);

        // Se existe pagamento, associar ao tenant
        if (existingPayment) {
          console.log('[AUTH] Associating payment to tenant...');
          const { error: associateError } = await supabase.rpc('update_tenant_subscription', {
            p_user_id: authData.user.id,
            p_subscription_tier: existingPayment.subscription_tier,
            p_subscribed: true
          });
          
          if (associateError) {
            console.error('[AUTH] Error associating payment:', associateError);
          } else {
            console.log('[AUTH] Payment associated successfully');
          }
        }

                 // Cria horários de funcionamento baseados na seleção do cadastro
         const rows = Array.from({ length: 7 }, (_, weekday) => ({
           tenant_id: tenantRow!.id,
           weekday,
           open_time: values.working_days.includes(weekday) ? values.open_time : null,
           close_time: values.working_days.includes(weekday) ? values.close_time : null,
           closed: !values.working_days.includes(weekday),
         }));
         const { error: bhError } = await supabase.from("business_hours").insert(rows as any);
         if (bhError) {
           console.error('[AUTH] Error creating business hours:', bhError);
           throw bhError;
         }
         console.log('[AUTH] Business hours created successfully');

        // Limpar localStorage
        localStorage.removeItem('planSelected');
        localStorage.removeItem('productSelected');

        toast({
          title: "Conta criada com sucesso!",
          description: existingPayment 
            ? "Sua conta foi criada e o pagamento foi associado. Você pode fazer login agora."
            : "Verifique seu email para confirmar a conta e acessar o painel."
        });
        
        signupForm.reset();
        
        // Se já tem pagamento, redirecionar para login
        if (existingPayment) {
          setIsLogin(true);
          setEmail(values.email);
        }
      }
    } catch (error: any) {
      console.error('[AUTH] Error during signup:', error);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };



  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header com toggle de tema */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-center py-8 px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
            <Scissors className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            StyleSwift
          </h1>
        </div>
      </div>

      <div className="container flex items-center justify-center min-h-screen p-4 lg:min-h-screen">
        <div className="grid gap-6 lg:gap-8 lg:grid-cols-2 max-w-6xl w-full">
          {/* Lado esquerdo - Informações */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="hidden lg:flex flex-col justify-center space-y-8"
          >
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center">
                  <Scissors className="h-6 w-6 text-primary-foreground" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  StyleSwift
                </h1>
              </div>

              <h2 className="text-4xl font-bold leading-tight">
                Automatize seus agendamentos com{" "}
                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  facilidade
                </span>
              </h2>

              <p className="text-xl text-muted-foreground leading-relaxed">
                Crie sua página de agendamento profissional em minutos.
                Gerencie clientes, horários e pagamentos tudo em um só lugar.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-lg">Página pública personalizada</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-lg">Agenda inteligente</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-lg">Notificações automáticas</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-lg">Dashboard completo</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="px-4 py-2">
                <Sparkles className="w-4 h-4 mr-2" />
                Gratuito para sempre
              </Badge>
              <Badge variant="outline" className="px-4 py-2">
                500+ barbearias ativas
              </Badge>
            </div>
          </motion.div>

          {/* Lado direito - Formulário */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex items-center justify-center lg:col-start-2"
          >
            <Card className="w-full max-w-md border-0 shadow-2xl bg-background/80 backdrop-blur-sm">
              <CardHeader className="text-center space-y-2">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Scissors className="h-8 w-8 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl font-bold">
                  {isLogin ? "Bem-vindo de volta!" : "Crie sua conta"}
                </CardTitle>
                <CardDescription className="text-base">
                  {isLogin
                    ? "Entre na sua conta para acessar o painel"
                    : "Comece gratuitamente e automatize seus agendamentos"
                  }
                </CardDescription>
                {!isLogin && (
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Importante:</strong> Cada usuário pode criar apenas um estabelecimento. 
                      O slug da URL será gerado automaticamente baseado no nome do estabelecimento.
                    </p>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {isLogin ? (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="h-12"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Senha
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-12"
                        required
                        minLength={6}
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                      disabled={loading}
                    >
                      {loading ? (
                        <Loading size="sm" text="Entrando..." />
                      ) : (
                        <>
                          Entrar
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                ) : canAccessSignup ? (
                  <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-6 lg:space-y-8">
                    <div className="grid gap-4 lg:gap-6 md:grid-cols-2">
                      <div className="space-y-3">
                        <Label htmlFor="signup-email" className="text-sm font-medium flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email
                        </Label>
                        <Input
                          id="signup-email"
                          type="email"
                          {...signupForm.register("email")}
                          placeholder="seu@email.com"
                          className="h-12"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="signup-password" className="text-sm font-medium flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          Senha
                        </Label>
                        <Input
                          id="signup-password"
                          type="password"
                          {...signupForm.register("password")}
                          placeholder="••••••••"
                          className="h-12"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Seu nome
                        </Label>
                        <Input
                          id="name"
                          {...signupForm.register("name")}
                          placeholder="Seu nome completo"
                          className="h-12"
                        />
                      </div>
                      <div className="space-y-3 md:col-span-2">
                        <Label htmlFor="business_name" className="text-sm font-medium flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Nome do estabelecimento
                        </Label>
                        <Input
                          id="business_name"
                          {...signupForm.register("business_name")}
                          placeholder="Barbearia do João ou Salão da Maria"
                          className="h-12"
                        />
                        <p className="text-xs text-muted-foreground">
                          O slug da URL será gerado automaticamente baseado no nome do estabelecimento
                        </p>
                      </div>
                      {/* Funcionamento */}
                      <div className="space-y-4 md:col-span-2 rounded-lg border p-3 lg:p-4">
                        <Label className="text-sm font-medium">Funcionamento</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm">Horário de abertura</Label>
                            <Input type="time" className="h-12" {...signupForm.register("open_time")} />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm">Horário de fechamento</Label>
                            <Input type="time" className="h-12" {...signupForm.register("close_time")} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 lg:gap-3">
                          {[{label:"Dom",value:0},{label:"Seg",value:1},{label:"Ter",value:2},{label:"Qua",value:3},{label:"Qui",value:4},{label:"Sex",value:5},{label:"Sáb",value:6}].map(d => (
                            <label key={d.value} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={signupForm.watch("working_days").includes(d.value)}
                                onCheckedChange={(ck) => {
                                  const curr = new Set(signupForm.getValues("working_days"));
                                  if (ck) curr.add(d.value); else curr.delete(d.value);
                                  signupForm.setValue("working_days", Array.from(curr).sort() as any);
                                }}
                              />
                              {d.label}
                            </label>
                          ))}
                        </div>
                        {signupForm.formState.errors.working_days && (
                          <p className="text-sm text-destructive">{signupForm.formState.errors.working_days.message as string}</p>
                        )}
                      </div>
                                             <div className="space-y-3 md:col-span-2">
                         <Label htmlFor="theme_variant" className="text-sm font-medium flex items-center gap-2">
                           <Palette className="h-4 w-4" />
                           Tema do Estabelecimento
                         </Label>
                         <Select onValueChange={(v) => signupForm.setValue("theme_variant", v as "barber" | "salon")}>
                           <SelectTrigger className="h-12">
                             <SelectValue placeholder="Escolha o tema do seu estabelecimento" />
                           </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="barber">Barbearia (Tema Masculino)</SelectItem>
                             <SelectItem value="salon">Salão (Tema Feminino)</SelectItem>
                           </SelectContent>
                         </Select>
                         <p className="text-xs text-muted-foreground">
                           Escolha o tema visual que melhor representa seu estabelecimento
                         </p>
                       </div>
                       <div className="space-y-3 md:col-span-2">
                         <Label htmlFor="logo_url" className="text-sm font-medium">
                           Logo (URL - opcional)
                         </Label>
                         <Input
                           id="logo_url"
                           {...signupForm.register("logo_url")}
                           placeholder="https://exemplo.com/logo.png"
                           className="h-12"
                         />
                         <p className="text-xs text-muted-foreground">
                           Link para a imagem do seu logo (recomendado: 200x200px)
                         </p>
                       </div>
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                      disabled={loading}
                    >
                      {loading ? (
                        <Loading size="sm" text="Criando conta..." />
                      ) : (
                        <>
                          Criar conta gratuita
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="p-6 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <h3 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
                        Plano Necessário
                      </h3>
                      <p className="text-sm text-orange-600 dark:text-orange-300 mb-4">
                        Para se cadastrar, você precisa primeiro escolher um plano de assinatura.
                      </p>
                      <Button 
                        onClick={() => window.location.href = '/#planos'} 
                        className="w-full"
                      >
                        Escolher Plano
                      </Button>
                    </div>
                  </div>
                )}

                <div className="text-center">
                  <Button
                    variant="link"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-sm"
                  >
                    {isLogin
                      ? "Não tem conta? Criar conta gratuita"
                      : "Já tem conta? Fazer login"
                    }
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </main>
  );
}

