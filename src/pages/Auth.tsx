import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  business_name: z.string().min(2, "Nome da barbearia obrigatório"),
  slug: z.string().min(2, "Slug obrigatório").regex(/^[a-z0-9-]+$/, "Use letras minúsculas, números e hífen"),
  theme_variant: z.enum(["barber", "salon"]).default("barber"),
  logo_url: z.string().url().optional().or(z.literal("")),
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

  // Bloqueio leve: exigir assinatura antes do cadastro (placeholder)
  // Em produção, isto deve consultar o backend/Stripe via RLS/Function para validar o status do usuário/tenant.
  const canAccessSignup = true; // Ajustado depois via webhook/state de assinatura

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
      // Primeiro cria o usuário
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: `${window.location.origin}/admin`
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Cria o tenant e retorna o id
        const { data: tenantRow, error: tenantError } = await supabase
          .from("tenants")
          .insert({
            owner_id: authData.user.id,
            name: values.business_name,
            slug: values.slug,
            theme_variant: values.theme_variant,
            logo_url: values.logo_url || null,
          })
          .select("id")
          .single();

        if (tenantError) throw tenantError;

        // Cria horários de funcionamento baseados na seleção do cadastro
        const rows = Array.from({ length: 7 }, (_, weekday) => ({
          tenant_id: tenantRow!.id,
          weekday,
          open_time: values.working_days.includes(weekday) ? values.open_time : null,
          close_time: values.working_days.includes(weekday) ? values.close_time : null,
          closed: !values.working_days.includes(weekday),
        }));
        const { error: bhError } = await supabase.from("business_hours").insert(rows as any);
        if (bhError) throw bhError;

        toast({
          title: "Conta criada com sucesso!",
          description: "Verifique seu email para confirmar a conta e acessar o painel."
        });
        signupForm.reset();
      }
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



  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header com toggle de tema */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="container flex items-center justify-center min-h-screen p-4">
        <div className="grid gap-8 lg:grid-cols-2 max-w-6xl w-full">
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
            className="flex items-center justify-center"
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
                ) : (
                  <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-8">
                    <div className="grid gap-6 md:grid-cols-2">
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
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="slug" className="text-sm font-medium flex items-center gap-2">
                          <Link className="h-4 w-4" />
                          Slug público
                        </Label>
                        <Input
                          id="slug"
                          {...signupForm.register("slug")}
                          placeholder="barbearia-joao"
                          className="h-12"
                        />
                        <p className="text-xs text-muted-foreground">
                          Sua URL será: style-swift.com/agendamento?tenant=barbearia-joao
                        </p>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Palette className="h-4 w-4" />
                          Tema
                        </Label>
                        <Select onValueChange={(v) => signupForm.setValue("theme_variant", v as any)}>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Escolha o tema" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="barber">Barbearia (dark + dourado)</SelectItem>
                            <SelectItem value="salon">Salão de Beleza (clean + rosa)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Funcionamento */}
                      <div className="space-y-4 md:col-span-2 rounded-lg border p-4">
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
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

