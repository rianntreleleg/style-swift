import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Building2, 
  Scissors, 
  Users2, 
  LogOut, 
  ExternalLink, 
  Plus,
  Calendar,
  TrendingUp,
  DollarSign,
  Clock,
  Settings,
  BarChart3,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Copy,
  Check,
  Crown,
  Loader2,
  AlertTriangle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { motion } from "framer-motion";
import SubscriptionPlans from "@/components/SubscriptionPlans";
import RevenueChart from "@/components/RevenueChart";
import ServicesTable from "@/components/ServicesTable";
import ProfessionalsTable from "@/components/ProfessionalsTable";
import AppointmentsTable from "@/components/AppointmentsTable";
import { formatBRL } from "@/lib/utils";

const TenantSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  slug: z.string().min(2, "Slug obrigatório").regex(/^[a-z0-9-]+$/, "Use letras minúsculas, números e hífen"),
  theme_variant: z.enum(["barber", "salon"]).default("barber"),
  logo_url: z.string().url().optional().or(z.literal("")),
});

type TenantForm = z.infer<typeof TenantSchema>;

const ServiceSchema = z.object({
  tenant_id: z.string().uuid("Selecione o estabelecimento"),
  name: z.string().min(2),
  price_reais: z.coerce.number().min(0, "Preço deve ser maior que zero"),
  duration_minutes: z.coerce.number().min(5).max(480),
  description: z.string().optional(),
});

type ServiceForm = z.infer<typeof ServiceSchema>;

const ProSchema = z.object({
  tenant_id: z.string().uuid("Selecione o estabelecimento"),
  name: z.string().min(2),
  bio: z.string().optional(),
  avatar_url: z.string().url().optional().or(z.literal("")),
});

type ProForm = z.infer<typeof ProSchema>;

export default function Admin() {
  const { user, signOut } = useAuth();
  const { subscribed, subscription_tier, loading: subLoading, openCustomerPortal } = useSubscription();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Array<{ id: string; name: string; slug: string; logo_url?: string | null; theme_variant?: string }>>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({ services: 0, pros: 0, upcoming: 0 });
  const [copied, setCopied] = useState(false);
  
  // Novos estados para funcionalidades
  const [services, setServices] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [serviceRevenue, setServiceRevenue] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchTenants = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("tenants")
        .select("id,name,slug,logo_url,theme_variant")
        .eq("owner_id", user.id);
      if (error) {
        toast({ title: "Erro ao carregar estabelecimentos", description: error.message });
        return;
      }
      setTenants(data ?? []);
      if (!selectedTenantId && data && data.length) {
        setSelectedTenantId(data[0].id);
      }
    };
    fetchTenants();
  }, [user]);

  useEffect(() => {
    if (selectedTenantId) {
      serviceForm.setValue("tenant_id", selectedTenantId);
      proForm.setValue("tenant_id", selectedTenantId);
    }
  }, [selectedTenantId]);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!selectedTenantId) return;
      const [servicesCount, prosCount, appointmentsCount] = await Promise.all([
        supabase.from("services").select("*", { count: "exact", head: true }).eq("tenant_id", selectedTenantId),
        supabase.from("professionals").select("*", { count: "exact", head: true }).eq("tenant_id", selectedTenantId),
        supabase.from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", selectedTenantId)
          .gte("start_time", new Date().toISOString())
      ]);
      setMetrics({
        services: servicesCount.count || 0,
        pros: prosCount.count || 0,
        upcoming: appointmentsCount.count || 0
      });
    };
    fetchMetrics();
  }, [selectedTenantId]);

  // Carregar dados quando tenant for selecionado
  useEffect(() => {
    if (selectedTenantId) {
      fetchServices();
      fetchProfessionals();
      fetchAppointments();
      fetchRevenueData();
    }
  }, [selectedTenantId]);

  const tenantForm = useForm<TenantForm>({ resolver: zodResolver(TenantSchema) });
  const serviceForm = useForm<ServiceForm>({ resolver: zodResolver(ServiceSchema) });
  const proForm = useForm<ProForm>({ resolver: zodResolver(ProSchema) });

  const selectedTenant = useMemo(() => tenants.find(t => t.id === selectedTenantId) || null, [tenants, selectedTenantId]);

  const onCreateTenant = async (values: TenantForm) => {
    if (!user) return;

    const { error } = await supabase.from("tenants").insert({
      owner_id: user.id,
      name: values.name,
      slug: values.slug,
      theme_variant: values.theme_variant,
      logo_url: values.logo_url || null,
    } as any);

    if (error) {
      toast({ title: "Erro ao criar estabelecimento", description: error.message });
      return;
    }

    toast({ title: "Estabelecimento criado com sucesso!" });
    tenantForm.reset();
    const { data } = await supabase
      .from("tenants")
      .select("id,name,slug,logo_url,theme_variant")
      .eq("owner_id", user.id);
    setTenants(data ?? []);
  };

  const onCreateService = async (values: ServiceForm) => {
    const { error } = await supabase.from("services").insert({
      tenant_id: values.tenant_id,
      name: values.name,
      price_cents: Math.round(values.price_reais * 100), // Converter reais para centavos
      duration_minutes: values.duration_minutes,
      description: values.description,
      active: true
    } as any);

    if (error) {
      toast({ title: "Erro ao criar serviço", description: error.message });
      return;
    }

    toast({ title: "Serviço criado com sucesso!" });
    serviceForm.reset();
    if (selectedTenantId) {
      serviceForm.setValue("tenant_id", selectedTenantId);
    }
    fetchServices();
  };

  const fetchServices = async () => {
    if (!selectedTenantId) return;
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("tenant_id", selectedTenantId)
      .order("name");
    if (error) {
      toast({ title: "Erro ao carregar serviços", description: error.message });
      return;
    }
    setServices(data ?? []);
  };

  const fetchProfessionals = async () => {
    if (!selectedTenantId) return;
    const { data, error } = await supabase
      .from("professionals")
      .select("*")
      .eq("tenant_id", selectedTenantId)
      .order("name");
    if (error) {
      toast({ title: "Erro ao carregar profissionais", description: error.message });
      return;
    }
    setProfessionals(data ?? []);
  };

  const fetchAppointments = async () => {
    if (!selectedTenantId) return;
    const { data, error } = await supabase
      .from("appointments")
      .select(`
        *,
        services(name, price_cents),
        professionals(name)
      `)
      .eq("tenant_id", selectedTenantId)
      .order("start_time", { ascending: false });
    if (error) {
      toast({ title: "Erro ao carregar agendamentos", description: error.message });
      return;
    }
    setAppointments(data ?? []);
  };

  const fetchRevenueData = async () => {
    if (!selectedTenantId) return;
    
    // Buscar agendamentos concluídos dos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: appointments, error } = await supabase
      .from("appointments")
      .select(`
        *,
        services!inner(name, price_cents)
      `)
      .eq("tenant_id", selectedTenantId)
      .eq("status", "concluido")
      .gte("start_time", thirtyDaysAgo.toISOString())
      .order("start_time");

    if (error) {
      console.error("Erro ao carregar dados de receita:", error);
      return;
    }

    // Processar dados para o gráfico
    const revenueByDate = appointments?.reduce((acc: any, appointment: any) => {
      const date = new Date(appointment.start_time).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += appointment.services.price_cents / 100;
      return acc;
    }, {});

    const chartData = Object.entries(revenueByDate || {}).map(([date, revenue]) => ({
      date,
      revenue: revenue as number
    }));

    setRevenueData(chartData);
    setTotalRevenue(chartData.reduce((sum, item) => sum + item.revenue, 0));

    // Processar receita por serviço
    const revenueByService = appointments?.reduce((acc: any, appointment: any) => {
      const serviceName = appointment.services.name;
      if (!acc[serviceName]) {
        acc[serviceName] = { count: 0, revenue: 0 };
      }
      acc[serviceName].count += 1;
      acc[serviceName].revenue += appointment.services.price_cents / 100;
      return acc;
    }, {});

    const serviceData = Object.entries(revenueByService || {}).map(([name, data]: [string, any]) => ({
      name,
      count: data.count,
      revenue: data.revenue
    }));

    setServiceRevenue(serviceData);
  };

  const onCreatePro = async (values: ProForm) => {
    const { error } = await supabase.from("professionals").insert({
      tenant_id: values.tenant_id,
      name: values.name,
      bio: values.bio,
      avatar_url: values.avatar_url || null,
      active: true
    } as any);

    if (error) {
      toast({ title: "Erro ao criar profissional", description: error.message });
      return;
    }

    toast({ title: "Profissional criado com sucesso!" });
    proForm.reset();
    if (selectedTenantId) {
      proForm.setValue("tenant_id", selectedTenantId);
    }
    fetchProfessionals();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleManageSubscription = async () => {
    try {
      await openCustomerPortal();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível abrir o portal de assinatura.",
        variant: "destructive",
      });
    }
  };

  const getPublicBookingUrl = () => {
    const baseUrl = window.location.origin;
    if (selectedTenant?.slug) {
      return `${baseUrl}/agendamento?tenant=${selectedTenant.slug}`;
    }
    return '';
  };

  const handleCopyLink = async () => {
    const url = getPublicBookingUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: 'Link copiado!',
        description: 'O link de agendamento foi copiado para a área de transferência.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar o link. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleOpenLink = () => {
    const url = getPublicBookingUrl();
    window.open(url, '_blank');
  };

  const handleGoToBookingPage = () => {
    const url = getPublicBookingUrl();
    window.location.href = url;
  };

  if (!user) {
    return null;
  }

  if (subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <Loader2 className="h-16 w-16 text-primary mx-auto mb-4 animate-spin" />
          <h2 className="text-2xl font-bold mb-2">Verificando assinatura...</h2>
          <p className="text-muted-foreground">Aguarde um momento</p>
        </motion.div>
      </div>
    );
  }

  if (!subscribed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <header className="border-b bg-background/80 backdrop-blur-sm">
          <div className="container flex items-center justify-between py-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                <Scissors className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">StyleSwift Admin</h1>
                <p className="text-muted-foreground">Bem-vindo, {user.email}</p>
              </div>
            </motion.div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </header>

        <main className="container py-8 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/20 dark:to-orange-800/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-10 w-10 text-orange-600 dark:text-orange-400" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Assinatura Necessária</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Para cadastrar sua barbearia/salão e começar a receber agendamentos online, você precisa escolher um plano de assinatura.
            </p>
          </motion.div>

          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-2xl">
                <Crown className="h-6 w-6 text-primary" />
                Escolha seu Plano
              </CardTitle>
              <CardDescription className="text-base">
                Planos mensais com cancelamento a qualquer momento
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <SubscriptionPlans currentTier={subscription_tier} />
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container flex items-center justify-between py-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
              <Scissors className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">StyleSwift Admin</h1>
              <p className="text-muted-foreground">Bem-vindo, {user.email}</p>
            </div>

            <div className="flex items-center gap-4">
              {tenants.length > 0 && (
                <motion.div
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <Select value={selectedTenantId ?? undefined} onValueChange={(v) => setSelectedTenantId(v)}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Selecione o estabelecimento" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTenant && (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={`${window.location.origin}/agendamento?tenant=${selectedTenant.slug}`}
                        target="_blank"
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Ver página
                      </a>
                    </Button>
                  )}
                </motion.div>
              )}

              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        <Tabs defaultValue="dashboard">
          <TabsList className="grid w-full grid-cols-6 bg-muted/50 p-1 rounded-lg">
            <TabsTrigger value="dashboard" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <BarChart3 className="h-4 w-4" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="establishment" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Building2 className="h-4 w-4" /> Estabelecimento
            </TabsTrigger>
            <TabsTrigger value="services" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Scissors className="h-4 w-4" /> Serviços
            </TabsTrigger>
            <TabsTrigger value="pros" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Users2 className="h-4 w-4" /> Profissionais
            </TabsTrigger>
            <TabsTrigger value="appointments" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Calendar className="h-4 w-4" /> Agendamentos
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Settings className="h-4 w-4" /> Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {/* Status da Assinatura */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <Crown className="h-5 w-5" />
                    Status da Assinatura
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-green-800 dark:text-green-300">
                        Plano {subscription_tier?.charAt(0).toUpperCase() + subscription_tier?.slice(1)}
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        Assinatura ativa e funcionando
                      </p>
                    </div>
                    <Button variant="outline" onClick={handleManageSubscription} className="border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/20">
                      Gerenciar Assinatura
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Métricas */}
              <div className="grid gap-6 md:grid-cols-3">
                <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Serviços Ativos</CardTitle>
                    <Scissors className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.services}</div>
                    <p className="text-xs text-muted-foreground">
                      +20.1% em relação ao mês passado
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Profissionais</CardTitle>
                    <Users2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.pros}</div>
                    <p className="text-xs text-muted-foreground">
                      +5 novos este mês
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Próximos Agendamentos</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.upcoming}</div>
                    <p className="text-xs text-muted-foreground">
                      Próximos agendamentos
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Link Público de Agendamento */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ExternalLink className="h-5 w-5" />
                    Link Público de Agendamento
                  </CardTitle>
                  <CardDescription>
                    Compartilhe este link com seus clientes para que possam agendar online
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="booking-url">URL de Agendamento</Label>
                    <div className="flex gap-2">
                      <Input
                        id="booking-url"
                        value={getPublicBookingUrl()}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleCopyLink}
                        className="shrink-0"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleOpenLink}
                        className="shrink-0"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="default"
                        onClick={handleGoToBookingPage}
                        className="shrink-0"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Ir para Agendamento
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dashboard Financeiro */}
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Receita dos Últimos 30 Dias
                    </CardTitle>
                    <CardDescription>
                      Gráfico de receita ao longo do tempo
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RevenueChart data={revenueData} totalRevenue={totalRevenue} period="dos Últimos 30 Dias" />
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Receita por Serviço
                    </CardTitle>
                    <CardDescription>
                      Receita gerada por cada serviço
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {serviceRevenue.map((service, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium">{service.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {service.count} agendamento{service.count !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <p className="font-bold text-green-600">
                            {formatBRL(service.revenue)}
                          </p>
                        </div>
                      ))}
                      {serviceRevenue.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                          Nenhuma receita registrada no período
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="establishment" className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Cadastrar Estabelecimento
                  </CardTitle>
                  <CardDescription>
                    Configure seu estabelecimento para começar a receber agendamentos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={tenantForm.handleSubmit(onCreateTenant)} className="space-y-8">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Nome do Estabelecimento</Label>
                        <Input {...tenantForm.register("name")} placeholder="Ex: Barbearia do João" className="h-12" />
                        {tenantForm.formState.errors.name && <p className="text-sm text-destructive">{tenantForm.formState.errors.name.message}</p>}
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Slug da URL</Label>
                        <Input {...tenantForm.register("slug")} placeholder="barbearia-joao" className="h-12" />
                        {tenantForm.formState.errors.slug && <p className="text-sm text-destructive">{tenantForm.formState.errors.slug.message}</p>}
                        <p className="text-xs text-muted-foreground">
                          URL: {window.location.origin}/agendamento?tenant=seu-slug
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Tipo de Estabelecimento</Label>
                        <Select onValueChange={(value) => tenantForm.setValue("theme_variant", value as "barber" | "salon")}>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="barber">Barbearia</SelectItem>
                            <SelectItem value="salon">Salão de Beleza</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Logo (URL)</Label>
                        <Input {...tenantForm.register("logo_url")} placeholder="https://exemplo.com/logo.jpg" className="h-12" />
                        <p className="text-xs text-muted-foreground">
                          Link para logo do estabelecimento (opcional)
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button type="submit" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 h-12 px-8">
                        <Plus className="mr-2 h-5 w-5" />
                        Cadastrar Estabelecimento
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="services" className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {/* Tabela de Serviços */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scissors className="h-5 w-5" />
                    Serviços Cadastrados
                  </CardTitle>
                  <CardDescription>
                    Gerencie todos os serviços do estabelecimento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ServicesTable 
                    services={services} 
                    onServiceUpdate={fetchServices}
                    tenantId={selectedTenantId || ''}
                  />
                </CardContent>
              </Card>

              {/* Formulário de Cadastro */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Cadastrar Novo Serviço
                  </CardTitle>
                  <CardDescription>
                    Cadastre seus serviços e valores. Os preços devem ser informados em reais.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={serviceForm.handleSubmit(onCreateService)} className="space-y-8">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Estabelecimento</Label>
                        <Select onValueChange={(v) => serviceForm.setValue("tenant_id", v)}>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Selecione o estabelecimento" />
                          </SelectTrigger>
                          <SelectContent>
                            {tenants.map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Nome do Serviço</Label>
                        <Input {...serviceForm.register("name")} placeholder="Ex: Corte masculino, Hidratação, etc." className="h-12" />
                      </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Preço (R$)</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            {...serviceForm.register("price_reais")}
                            placeholder="50.00"
                            className="h-12 pl-8"
                          />
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                            R$
                          </span>
                        </div>
                        
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Duração (minutos)</Label>
                        <Input
                          type="number"
                          {...serviceForm.register("duration_minutes")}
                          placeholder="45"
                          className="h-12"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Status</Label>
                        <Badge variant="secondary" className="w-full justify-center h-12 text-base">
                          Ativo
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Descrição</Label>
                      <Input
                        {...serviceForm.register("description")}
                        placeholder="Detalhes do serviço (opcional)"
                        className="h-12"
                      />
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button type="submit" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 h-12 px-8">
                        <Plus className="mr-2 h-5 w-5" />
                        Cadastrar Serviço
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="pros" className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {/* Tabela de Profissionais */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users2 className="h-5 w-5" />
                    Profissionais Cadastrados
                  </CardTitle>
                  <CardDescription>
                    Gerencie todos os profissionais do estabelecimento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProfessionalsTable 
                    professionals={professionals} 
                    onProfessionalUpdate={fetchProfessionals}
                    tenantId={selectedTenantId || ''}
                  />
                </CardContent>
              </Card>

              {/* Formulário de Cadastro */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Cadastrar Novo Profissional
                  </CardTitle>
                  <CardDescription>
                    Inclua os profissionais do seu time e suas especialidades.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={proForm.handleSubmit(onCreatePro)} className="space-y-8">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Estabelecimento</Label>
                        <Select onValueChange={(v) => proForm.setValue("tenant_id", v)}>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Selecione o estabelecimento" />
                          </SelectTrigger>
                          <SelectContent>
                            {tenants.map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Nome do Profissional</Label>
                        <Input {...proForm.register("name")} placeholder="Ex: João Silva, Maria Santos" className="h-12" />
                      </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Especialidade/Bio</Label>
                        <Input
                          {...proForm.register("bio")}
                          placeholder="Ex: Especialista em fade e barba, Colorista, etc."
                          className="h-12"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Avatar (URL)</Label>
                        <Input
                          {...proForm.register("avatar_url")}
                          placeholder="https://exemplo.com/foto.jpg"
                          className="h-12"
                        />
                        <p className="text-xs text-muted-foreground">
                          Link para foto do profissional (opcional)
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button type="submit" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 h-12 px-8">
                        <Plus className="mr-2 h-5 w-5" />
                        Cadastrar Profissional
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="appointments" className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <AppointmentsTable 
                appointments={appointments} 
                onAppointmentUpdate={fetchAppointments}
                tenantId={selectedTenantId || ''}
              />
            </motion.div>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Configurações do Estabelecimento
                  </CardTitle>
                  <CardDescription>
                    Personalize a aparência e informações do seu estabelecimento.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedTenant ? (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget as HTMLFormElement);
                        const logo = formData.get("logo_url") as string;
                        const { error } = await supabase.from("tenants")
                          .update({ logo_url: logo || null } as any)
                          .eq("id", selectedTenant.id);
                        if (error) {
                          toast({ title: "Erro ao salvar", description: error.message });
                        } else {
                          toast({ title: "Configurações atualizadas!" });
                          const { data } = await supabase
                            .from("tenants")
                            .select("id,name,slug,logo_url,theme_variant")
                            .eq("owner_id", user!.id);
                          setTenants(data ?? []);
                        }
                      }}
                      className="space-y-6"
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Nome do Estabelecimento</Label>
                          <Input
                            value={selectedTenant.name}
                            disabled
                            className="h-10 bg-muted"
                          />
                          <p className="text-xs text-muted-foreground">
                            Nome não pode ser alterado
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Slug da URL</Label>
                          <Input
                            value={selectedTenant.slug}
                            disabled
                            className="h-10 bg-muted"
                          />
                          <p className="text-xs text-muted-foreground">
                            URL: {window.location.origin}/agendamento?tenant={selectedTenant.slug}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Logo do Estabelecimento</Label>
                        <Input
                          id="logo_url"
                          name="logo_url"
                          defaultValue={selectedTenant.logo_url ?? ""}
                          placeholder="https://exemplo.com/logo.png"
                          className="h-10"
                        />
                        <p className="text-xs text-muted-foreground">
                          URL da imagem do logo (recomendado: 200x200px, formato PNG ou JPG)
                        </p>
                      </div>

                      <div className="flex justify-end">
                        <Button type="submit" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                          <Settings className="mr-2 h-4 w-4" />
                          Salvar Configurações
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="text-center py-8">
                      <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Selecione um estabelecimento para configurar.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}