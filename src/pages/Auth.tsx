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
import { getProductId } from "@/config/stripe";
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
  Sparkles,
  Crown,
  MapPin,
  Phone,
  CreditCard
} from "lucide-react";
import { motion } from "framer-motion";
import { useMemo } from "react";

const SignupSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  business_name: z.string().min(2, "Nome do estabelecimento obrigatório"),
  address: z.string().min(5, "Endereço obrigatório"),
  phone: z.string().min(10, "Telefone obrigatório").regex(/^[\d\s\(\)\-\+]+$/, "Formato de telefone inválido"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  logo_url: z.string().url().optional().or(z.literal("")),
  theme_variant: z.enum(["barber", "salon"]).default("barber"),
  plan_tier: z.enum(["essential", "professional", "premium"]).default("professional"),
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
      plan_tier: (searchParams.get('plan') as "essential" | "professional" | "premium") || "professional",
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

  // NOVO FLUXO: Permitir cadastro direto (plano é selecionado no formulário)
  const canAccessSignup = true;

  // Verificar se veio do checkout de pagamento
  const checkoutSuccess = searchParams.get('checkout') === 'success';
  const sessionId = searchParams.get('session_id');
  const needsPayment = localStorage.getItem('needsPayment') === 'true';

  useEffect(() => {
    if (checkoutSuccess && sessionId) {
      // Usuário veio do pagamento bem-sucedido
      toast({
        title: "Pagamento realizado com sucesso!",
        description: "Agora você pode fazer login.",
      });
      
      // Limpar localStorage
      localStorage.removeItem('needsPayment');
      localStorage.removeItem('tenantId');
      localStorage.removeItem('planSelected');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('customerId');
      
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

    setLoading(true);
    try {
      const planSelected = values.plan_tier; // Usar o plano selecionado no formulário
      console.log('[AUTH] Plan selected from form:', planSelected);
      
      if (!planSelected) {
        throw new Error('Seleção de plano é obrigatória');
      }
      
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

        // NOVO FLUXO: CRIAR CUSTOMER NO STRIPE IMEDIATAMENTE
        console.log('[AUTH] Criando customer no Stripe para:', values.email);
        const { data: customerData, error: customerError } = await supabase.functions.invoke('create-customer', {
          body: { 
            email: values.email,
            name: values.name,
            metadata: {
              planTier: planSelected || 'essential',
              businessName: values.business_name,
              themeVariant: values.theme_variant
            }
          }
        });

        if (customerError) {
          console.error('[AUTH] Erro ao criar customer:', customerError);
          throw new Error('Erro ao criar customer no Stripe: ' + customerError.message);
        }

        console.log('[AUTH] Customer criado no Stripe:', customerData.customer_id);

        // Verificar se já existe tenant ativo para este usuário
        const { data: existingTenant } = await supabase
          .from("tenants")
          .select("*")
          .eq("owner_id", authData.user.id)
          .eq("plan_status", "active")
          .eq("payment_completed", true)
          .single();

        console.log('[AUTH] Existing active tenant found:', existingTenant);

        // Se já tem tenant ativo, não precisa pagar novamente
        if (existingTenant) {
          toast({
            title: "Conta já existe!",
            description: "Você já possui uma conta ativa. Redirecionando para o painel...",
          });
          
          // Redirecionar para o admin
          setTimeout(() => {
            navigate('/admin');
          }, 2000);
          return;
        }

        // Verificar se já existe pagamento para este email (compatibilidade com sistema antigo)
        const { data: existingPayment } = await supabase
          .from("subscribers")
          .select("*")
          .eq("email", values.email)
          .eq("subscribed", true)
          .single();

        console.log('[AUTH] Existing payment found:', existingPayment);

                 // Cria o tenant com customer_id SEMPRE (payment_completed = false por padrão)
         const tenantData = {
           owner_id: authData.user.id,
           name: values.business_name,
           slug: finalSlug,
           theme_variant: values.theme_variant,
           logo_url: values.logo_url || null,
           plan_tier: planSelected || 'essential',
           plan_status: existingPayment ? 'active' : 'pending', // PENDING = esperando pagamento
           payment_completed: !!existingPayment,
           stripe_customer_id: customerData.customer_id, // SEMPRE tem customer_id
           address: values.address, // Adicionar endereço
           phone: values.phone, // Adicionar telefone
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

        if (existingPayment) {
          toast({
            title: "Conta criada com sucesso!",
            description: "Sua conta foi criada e o pagamento foi associado. Você pode fazer login agora."
          });
          
          // Se já tem pagamento, redirecionar para login
          setIsLogin(true);
          setEmail(values.email);
        } else {
          // NOVO FLUXO: Redirecionar automaticamente para o checkout
          console.log('[AUTH] Iniciando processo de checkout imediato...');
          
          // Salvar dados para o checkout
          localStorage.setItem('tenantId', tenantRow!.id);
          localStorage.setItem('planSelected', planSelected || 'essential');
          localStorage.setItem('userEmail', values.email);
          localStorage.setItem('customerId', customerData.customer_id);
          localStorage.setItem('needsPayment', 'true');
          
          toast({
            title: "Conta criada com sucesso! 🎉",
            description: "Redirecionando para o pagamento..."
          });
          
          // Tentar redirecionar imediatamente para o checkout
          console.log('[AUTH] Executando redirecionamento imediato para checkout...');
          try {
            await handleProceedToPayment();
          } catch (error) {
            console.error('[AUTH] Falha no redirecionamento automático:', error);
            // Não fazer nada aqui - o usuário verá o botão manual
          }
        }
        
        signupForm.reset();
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

  const handleProceedToPayment = async () => {
    const tenantId = localStorage.getItem('tenantId');
    const planSelected = localStorage.getItem('planSelected');
    const userEmail = localStorage.getItem('userEmail');
    const customerId = localStorage.getItem('customerId');

    console.log('[AUTH] Dados do localStorage:', {
      tenantId, planSelected, userEmail, customerId
    });

    if (!tenantId || !planSelected || !userEmail || !customerId) {
      const missingFields = [];
      if (!tenantId) missingFields.push('tenantId');
      if (!planSelected) missingFields.push('planSelected');
      if (!userEmail) missingFields.push('userEmail');
      if (!customerId) missingFields.push('customerId');
      
      console.error('[AUTH] Dados faltando:', missingFields);
      toast({
        title: "Erro",
        description: `Dados de pagamento não encontrados: ${missingFields.join(', ')}. Tente se cadastrar novamente.`,
        variant: "destructive"
      });
      return;
    }

    console.log('[AUTH] Iniciando checkout automático com dados:', {
      tenantId, planSelected, userEmail, customerId
    });

    setLoading(true);
    try {
      console.log('[AUTH] Obtendo productId para plano:', planSelected);
      const productId = getProductId(planSelected);
      console.log('[AUTH] ProductId obtido:', productId);

      console.log('[AUTH] Chamando create-checkout-session...');
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-checkout-session', {
        body: { 
          productId,
          customerId,
          tenantId,
          userEmail
        }
      });
      
      console.log('[AUTH] Resposta da função:', { checkoutData, checkoutError });
      
      if (checkoutError) {
        console.error('[AUTH] Erro no checkout:', checkoutError);
        throw new Error(checkoutError.message || 'Erro na função de checkout');
      }
      
      if (checkoutData?.url) {
        console.log('[AUTH] Redirecionando para checkout:', checkoutData.url);
        window.location.href = checkoutData.url;
      } else {
        console.error('[AUTH] URL de checkout não recebida:', checkoutData);
        throw new Error('URL de checkout não recebida');
      }
    } catch (e: any) {
      console.error('[AUTH] Erro ao processar pagamento:', e);
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
                 StyleSwift
               </h2>

               <p className="text-xl text-muted-foreground leading-relaxed">
                 Automatize seus agendamentos com facilidade
               </p>

               <p className="text-lg text-muted-foreground leading-relaxed">
                 Crie sua página de agendamento profissional em minutos. Gerencie clientes, horários e pagamentos tudo em um só lugar.
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
               <div className="flex items-center gap-3">
                 <CheckCircle2 className="h-5 w-5 text-green-500" />
                 <span className="text-lg">Setup em minutos</span>
               </div>
               <div className="flex items-center gap-3">
                 <CheckCircle2 className="h-5 w-5 text-green-500" />
                 <span className="text-lg">500+ estabelecimentos ativos</span>
               </div>
             </div>

            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="px-4 py-2">
                <Sparkles className="w-4 h-4 mr-2" />
                Setup em minutos
              </Badge>
              <Badge variant="outline" className="px-4 py-2">
                500+ estabelecimentos ativos
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
              <CardHeader className="text-center space-y-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center mx-auto">
                  <Scissors className="h-8 w-8 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl font-bold">
                  {isLogin ? "Bem-vindo de volta!" : "Criar Estabelecimento"}
                </CardTitle>
                                 <CardDescription className="text-base">
                   {isLogin
                     ? "Entre na sua conta para acessar o painel"
                     : "Configure seu estabelecimento em 3 passos simples"
                   }
                 </CardDescription>
                 {!isLogin && (
                   <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                     <p className="text-xs text-blue-700 dark:text-blue-300">
                       <strong>ℹ️ Informações importantes:</strong> Os dados fornecidos serão usados para validação do estabelecimento, 
                       criação de conta e envio de emails de confirmação. Garantimos a segurança e privacidade das suas informações.
                     </p>
                   </div>
                 )}
                {!isLogin && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">1</div>
                      <span>Dados</span>
                    </div>
                    <ArrowRight className="h-3 w-3" />
                    <div className="flex items-center gap-1">
                      <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-medium">2</div>
                      <span>Pagamento</span>
                    </div>
                    <ArrowRight className="h-3 w-3" />
                    <div className="flex items-center gap-1">
                      <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-medium">3</div>
                      <span>Dashboard</span>
                    </div>
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
                    {/* Primeiro campo: Nome (100% largura) */}
                    <div className="space-y-3">
                      <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Nome
                      </Label>
                      <Input
                        id="name"
                        {...signupForm.register("name")}
                        placeholder="Seu nome completo"
                        className="h-12"
                      />
                      {signupForm.formState.errors.name && (
                        <p className="text-xs text-red-500">{signupForm.formState.errors.name.message}</p>
                      )}
                    </div>

                    {/* Segundo campo: Nome do estabelecimento (100% largura) */}
                    <div className="space-y-3">
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
                      {signupForm.formState.errors.business_name && (
                        <p className="text-xs text-red-500">{signupForm.formState.errors.business_name.message}</p>
                      )}
                    </div>

                                         {/* Terceiro campo: Endereço (100% largura) */}
                     <div className="space-y-3">
                       <Label htmlFor="address" className="text-sm font-medium flex items-center gap-2">
                         <MapPin className="h-4 w-4" />
                         Endereço
                       </Label>
                       <Input
                         id="address"
                         {...signupForm.register("address")}
                         placeholder="Rua das Flores, 123 - Centro"
                         className="h-12"
                       />
                       {signupForm.formState.errors.address && (
                         <p className="text-xs text-red-500">{signupForm.formState.errors.address.message}</p>
                       )}
                     </div>

                     {/* Quarto campo: Telefone (100% largura) */}
                     <div className="space-y-3">
                       <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                         <Phone className="h-4 w-4" />
                         Telefone
                       </Label>
                       <Input
                         id="phone"
                         {...signupForm.register("phone")}
                         placeholder="(11) 99999-9999"
                         className="h-12"
                       />
                       {signupForm.formState.errors.phone && (
                         <p className="text-xs text-red-500">{signupForm.formState.errors.phone.message}</p>
                       )}
                       <p className="text-xs text-muted-foreground">
                         Será usado para validação do estabelecimento e emails de confirmação
                       </p>
                     </div>

                     {/* Quinto e sexto campos: Email e Senha (layout responsivo) */}
                     <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
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
                         {signupForm.formState.errors.email && (
                           <p className="text-xs text-red-500">{signupForm.formState.errors.email.message}</p>
                         )}
                         <p className="text-xs text-muted-foreground">
                           Será usado para login e emails de confirmação
                         </p>
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
                         {signupForm.formState.errors.password && (
                           <p className="text-xs text-red-500">{signupForm.formState.errors.password.message}</p>
                         )}
                       </div>
                                           </div>
                    {/* Funcionamento */}
                    <div className="space-y-4 rounded-lg border p-3 lg:p-4">
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
                    <div className="space-y-3">
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
                                                                <div className="space-y-3">
                      <Label htmlFor="plan_tier" className="text-sm font-medium flex items-center gap-2">
                        <Crown className="h-4 w-4" />
                        Plano de Assinatura
                      </Label>
                         <Select onValueChange={(v) => signupForm.setValue("plan_tier", v as "essential" | "professional" | "premium")}>
                           <SelectTrigger className="h-12">
                             <SelectValue placeholder="Escolha seu plano" />
                           </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="essential">
                               <div className="flex flex-col">
                                 <span className="font-medium">Essencial - R$ 29,90/mês</span>
                                 <span className="text-xs text-muted-foreground">Ideal para começar</span>
                               </div>
                             </SelectItem>
                             <SelectItem value="professional">
                               <div className="flex flex-col">
                                 <span className="font-medium">Profissional - R$ 43,90/mês</span>
                                 <span className="text-xs text-muted-foreground">Mais popular - Dashboard financeiro</span>
                               </div>
                             </SelectItem>
                             <SelectItem value="premium">
                               <div className="flex flex-col">
                                 <span className="font-medium">Premium - R$ 79,90/mês</span>
                                 <span className="text-xs text-muted-foreground">Recursos avançados completos</span>
                               </div>
                             </SelectItem>
                           </SelectContent>
                         </Select>
                         <p className="text-xs text-muted-foreground">
                           Você finalizará o pagamento após criar a conta
                         </p>
                       </div>
                                                                <div className="space-y-3">
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
                                                             <Button
                      type="submit"
                      className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                      disabled={loading}
                    >
                      {loading ? (
                        <Loading size="sm" text="Criando estabelecimento..." />
                      ) : (
                        <>
                          Registrar e Criar Meu Estabelecimento
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">
                        🔒 Após o registro, você será redirecionado para o pagamento seguro
                      </p>
                    </div>
                  </form>
                ) : (
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">
                      Formulário de cadastro não disponível no momento. Entre em contato com o suporte.
                    </p>
                  </div>
                )}
                
                {/* Botão de fallback para checkout caso o redirecionamento automático falhe */}
                {needsPayment && (
                  <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <div className="text-center space-y-3">
                      <p className="text-sm text-orange-800 dark:text-orange-200">
                        🚨 Redirecionamento automático falhou?
                      </p>
                      <p className="text-xs text-orange-600 dark:text-orange-300">
                        Clique no botão abaixo para finalizar seu pagamento
                      </p>
                      <Button
                        onClick={handleProceedToPayment}
                        disabled={loading}
                        className="w-full bg-orange-600 hover:bg-orange-700"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        {loading ? 'Redirecionando...' : 'Finalizar Pagamento'}
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

