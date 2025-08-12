import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  CheckCircle2,
  LineChart,
  Link2,
  MessageSquare,
  Scissors,
  Users,
  Clock,
  Zap,
  Star,
  ArrowRight,
  Play,
  Shield,
  Smartphone,
  Calendar,
  TrendingUp,
  Award
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const [spot, setSpot] = useState({ x: "50%", y: "50%" });
  const [isVisible, setIsVisible] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const fadeInUp = {
    hidden: { opacity: 0, y: 60 },
    visible: { opacity: 1, y: 0 }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const startCheckout = async (productId: string) => {
    try {
      setLoadingPlan(productId);
      // Marca plano escolhido para gating client-side antes do cadastro
      localStorage.setItem('planSelected', productId);
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { planTier: productId }
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
      else throw new Error('Falha ao iniciar checkout.');
    } catch (e: any) {
      toast({ title: 'Erro ao iniciar assinatura', description: e.message, variant: 'destructive' });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container py-4 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <a href="/" className="font-bold text-2xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              StyleSwift
            </a>
          </motion.div>

          <nav className="hidden md:flex items-center gap-8 text-sm">
            <motion.a
              href="#recursos"
              className="text-muted-foreground hover:text-foreground transition-colors"
              whileHover={{ scale: 1.05 }}
            >
              Recursos
            </motion.a>
            <motion.a
              href="#planos"
              className="text-muted-foreground hover:text-foreground transition-colors"
              whileHover={{ scale: 1.05 }}
            >
              Planos
            </motion.a>
            <motion.a
              href="#contato"
              className="text-muted-foreground hover:text-foreground transition-colors"
              whileHover={{ scale: 1.05 }}
            >
              Contato
            </motion.a>
          </nav>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <a href="#planos">
                <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300">
                  Começar Grátis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </motion.div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section
          className="spotlight relative overflow-hidden"
          style={{
            "--spot-x": spot.x,
            "--spot-y": spot.y,
          } as any}
          onMouseMove={(e) => {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setSpot({ x: `${e.clientX - rect.left}px`, y: `${e.clientY - rect.top}px` });
          }}
        >
          <div className="container py-20 md:py-32 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-center"
            >
              <Badge className="mb-4 px-4 py-2 bg-primary/10 text-primary border-primary/20">
                ✨ Plataforma #1 para Barbearias e Salões
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                Automatize seus{" "}
                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  agendamentos
                </span>
                <br />
                em minutos
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
                Crie sua página de agendamento profissional. Gerencie clientes, horários e pagamentos tudo em um só lugar.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <a href="#planos">
                    <Button size="lg" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-6 text-lg">
                      Selecionar um Plano
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </a>
                </motion.div>

              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="text-center"
                >
                  <div className="text-3xl font-bold text-primary mb-2">500+</div>
                  <div className="text-muted-foreground">Estabelecimentos ativos</div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  className="text-center"
                >
                  <div className="text-3xl font-bold text-primary mb-2">10k+</div>
                  <div className="text-muted-foreground">Agendamentos realizados</div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                  className="text-center"
                >
                  <div className="text-3xl font-bold text-primary mb-2">4.9★</div>
                  <div className="text-muted-foreground">Avaliação dos clientes</div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section id="recursos" className="container py-20">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Recursos que fazem a diferença
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Tudo que você precisa para automatizar seu negócio e focar no que realmente importa
            </p>
          </motion.div>

          <motion.div
            className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div variants={fadeInUp}>
              <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-background to-muted/20">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Link2 className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Página Pública Personalizada</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    Seu link exclusivo (ex: /sua-barbearia) para clientes agendarem em segundos, com design profissional e responsivo.
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-background to-muted/20">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Agenda Inteligente</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    Horários fora do expediente são bloqueados automaticamente. Sistema de slots inteligente que evita conflitos.
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-background to-muted/20">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Smartphone className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Notificações Automáticas</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    WhatsApp e email automáticos para confirmações, lembretes e cancelamentos. Mantenha seus clientes informados.
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-background to-muted/20">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Dashboard Financeiro</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    Acompanhe faturamento, indicadores de desempenho, histórico de agendamentos e relatórios detalhados.
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-background to-muted/20">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Gestão de Profissionais</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    Cadastre sua equipe, defina especialidades e horários de trabalho. Cada profissional tem sua agenda.
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-background to-muted/20">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Segurança e Confiabilidade</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    Dados protegidos, backup automático e sistema 99.9% disponível. Sua informação está segura conosco.
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </section>



        {/* Themes Section */}
        <section className="container py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Temas Personalizados</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
              Destaque sua marca com layouts modernos, criados para o seu segmento.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Tema Barbearia */}
            <motion.div
              className="bg-card p-6 rounded-lg shadow-lg flex flex-col items-center text-center group"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
            >
              <h3 className="text-2xl font-semibold mb-4">Visual de Barbearia</h3>
              <p className="text-muted-foreground mb-6">
                Um tema robusto e clássico para o ambiente da barbearia, com cores escuras e tipografia elegante.
              </p>

              {/* Paleta de Cores */}
              <div className="flex justify-center gap-4 mt-6">
                <div className="w-10 h-10 bg-[#1a237e] rounded-full shadow-md"></div>
                <div className="w-10 h-10 bg-[#283593] rounded-full shadow-md"></div>
                <div className="w-10 h-10 bg-[#3f51b5] rounded-full shadow-md"></div>
              </div>
            </motion.div>

            {/* Tema Salão de Beleza */}
            <motion.div
              className="bg-card p-6 rounded-lg shadow-lg flex flex-col items-center text-center group"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
            >
              <h3 className="text-2xl font-semibold mb-4">Visual de Salão de Beleza</h3>
              <p className="text-muted-foreground mb-6">
                Um tema leve e moderno, com paleta de cores claras e elementos sofisticados.
              </p>

              {/* Paleta de Cores */}
              <div className="flex justify-center gap-4 mt-6">
                <div className="w-10 h-10 bg-[#f8bbd0] rounded-full shadow-md"></div>
                <div className="w-10 h-10 bg-[#f48fb1] rounded-full shadow-md"></div>
                <div className="w-10 h-10 bg-[#f06292] rounded-full shadow-md"></div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Planos + Ancoragem Visual */}
        <section id="planos" className="container py-20">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Escolha seu plano</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Assine para continuar e liberar seu painel</p>
          </motion.div>

          <motion.div
            className="grid gap-8 md:grid-cols-3"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            {/* Essencial */}
            <Card className="border border-muted shadow-lg flex flex-col">
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl">Essencial</CardTitle>
                <CardDescription>Ideal para quem está começando</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-4xl font-bold">R$ 29,90<span className="text-base font-medium text-muted-foreground">/mês</span></div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> 1 profissional</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Página pública</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Agendamentos básicos</li>
                </ul>
                <Button disabled={!!loadingPlan} onClick={() => startCheckout('essential')} className="w-full">{loadingPlan === 'essential' ? 'Carregando...' : 'Selecionar Plano'}</Button>
                <p className="text-xs text-muted-foreground text-center">Ideal para quem está começando.</p>
              </CardContent>
            </Card>

            {/* Profissional – destaque */}
            <Card className="relative border-2 border-primary shadow-xl flex flex-col bg-gradient-to-b from-primary/5 to-background">
              <div className="absolute -top-3 right-4 bg-primary text-primary-foreground text-xs font-semibold px-2 py-1 rounded">MAIS VENDIDO</div>
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl">Profissional</CardTitle>
                <CardDescription>Feito para crescer sem dor de cabeça</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-4xl font-bold">R$ 43,90<span className="text-base font-medium text-muted-foreground">/mês</span></div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Até 3 profissionais</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Dashboard financeiro</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Suporte prioritário</li>
                </ul>
                <Button disabled={!!loadingPlan} onClick={() => startCheckout('professional')} className="w-full bg-primary">{loadingPlan === 'professional' ? 'Carregando...' : 'Selecionar Plano'}</Button>
                <p className="text-xs text-muted-foreground text-center">Feito para crescer sem dor de cabeça.</p>
              </CardContent>
            </Card>

            {/* Premium – elegante */}
            <Card className="relative border border-muted shadow-lg flex flex-col bg-muted/10">
              <div className="absolute -top-3 right-4 bg-foreground text-background text-xs font-semibold px-2 py-1 rounded">TUDO INCLUÍDO</div>
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl">Premium</CardTitle>
                <CardDescription>Seu negócio no piloto automático</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-4xl font-bold">R$ 79,90<span className="text-base font-medium text-muted-foreground">/mês</span></div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Profissionais ilimitados</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Relatórios avançados</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Recursos premium</li>
                </ul>
                <Button disabled={!!loadingPlan} onClick={() => startCheckout('premium')} className="w-full" variant="outline">{loadingPlan === 'premium' ? 'Carregando...' : 'Selecionar Plano'}</Button>
                <p className="text-xs text-muted-foreground text-center">Seu negócio no piloto automático.</p>
              </CardContent>
            </Card>
          </motion.div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/20">
        <div className="container py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4">StyleSwift</h3>
              <p className="text-muted-foreground">
                A plataforma completa para barbearias e salões automatizarem seus agendamentos.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#recursos" className="hover:text-foreground transition-colors">Recursos</a></li>
                <li><a href="#planos" className="hover:text-foreground transition-colors">Temas</a></li>
                <li><a href="/admin" className="hover:text-foreground transition-colors">Painel</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Suporte</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contato</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Status</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacidade</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Termos</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Cookies</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 StyleSwift. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
