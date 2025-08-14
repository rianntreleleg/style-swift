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
  Eye,
  Crown,
  RefreshCw
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePWA } from "@/hooks/usePWA";
import { motion } from "framer-motion";
import AppointmentsTable from "@/components/AppointmentsTable";
import { DailyAppointments } from "@/components/DailyAppointments";
import BusinessHoursManager from "@/components/BusinessHoursManager";
import FinancialDashboard from "@/components/FinancialDashboard";
import AutoConfirmationManager from "@/components/AutoConfirmationManager";
import ProfessionalsTable from "@/components/ProfessionalsTable";
import UpgradePrompt from "@/components/UpgradePrompt";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { PWAStatus } from "@/components/PWAStatus";
import { checkFeatureAccess, canAddProfessional, type PlanTier } from "@/config/plans";

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
  const navigate = useNavigate();
  const {
    isInstallable,
    isInstalled,
    isOnline,
    isAdmin,
    showInstallPrompt,
    hideInstallPrompt,
    installPWA,
    showInstallPromptFn
  } = usePWA();
  const [tenants, setTenants] = useState<Array<{ 
    id: string; 
    name: string; 
    slug: string; 
    logo_url?: string | null; 
    theme_variant?: string;
    plan_tier?: string;
    plan_status?: string;
  }>>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({ services: 0, pros: 0, upcoming: 0 });
  const [copied, setCopied] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
  }, [user, navigate]);

  const fetchTenants = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("tenants")
      .select("id,name,slug,logo_url,theme_variant,plan_tier,plan_status")
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

  useEffect(() => {
    fetchTenants();
  }, [user]);

  useEffect(() => {
    if (selectedTenantId) {
      serviceForm.setValue("tenant_id", selectedTenantId);
      proForm.setValue("tenant_id", selectedTenantId);
      fetchAppointments();
      fetchProfessionals();
    }
  }, [selectedTenantId]);

  const fetchAppointments = async () => {
    if (!selectedTenantId) return;
    
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          services(name, price_cents),
          professionals(name)
        `)
        .eq('tenant_id', selectedTenantId)
        .order('start_time', { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar agendamentos:', error);
      toast({
        title: 'Erro ao carregar agendamentos',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const fetchProfessionals = async () => {
    if (!selectedTenantId) return;
    
    try {
      const { data, error } = await supabase
        .from('professionals')
        .select('*')
        .eq('tenant_id', selectedTenantId)
        .order('name');

      if (error) throw error;
      setProfessionals(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar profissionais:', error);
      toast({
        title: 'Erro ao carregar profissionais',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!selectedTenantId) return;
      const [servicesCount, prosCount, appointmentsCount] = await Promise.all([
        supabase.from("services").select("*", { count: "exact", head: true }).eq("tenant_id", selectedTenantId),
        supabase.from("professionals").select("*", { count: "exact", head: true }).eq("tenant_id", selectedTenantId),
        supabase.from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", selectedTenantId)
          .gte("scheduled_at", new Date().toISOString())
      ]);
      setMetrics({
        services: servicesCount.count || 0,
        pros: prosCount.count || 0,
        upcoming: appointmentsCount.count || 0
      });
    };
    fetchMetrics();
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
      .select("id,name,slug,logo_url,theme_variant,plan_tier,plan_status")
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
      fetchProfessionals();
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container flex flex-col lg:flex-row items-start lg:items-center justify-between py-4 gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col lg:flex-row items-start lg:items-center gap-3 w-full"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                <Scissors className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">StyleSwift Admin</h1>
                <p className="text-muted-foreground text-sm">Bem-vindo, {user.email}</p>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 w-full lg:w-auto">
              {tenants.length > 0 && (
                <motion.div
                  className="flex flex-col lg:flex-row items-start lg:items-center gap-3 w-full lg:w-auto"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <Select value={selectedTenantId ?? undefined} onValueChange={(v) => setSelectedTenantId(v)}>
                    <SelectTrigger className="w-full lg:w-48">
                      <SelectValue placeholder="Selecione o estabelecimento" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTenant && (
                    <Button variant="outline" size="sm" asChild className="w-full lg:w-auto">
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

                             <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-start">
                 <PWAStatus
                   isInstallable={isInstallable}
                   isInstalled={isInstalled}
                   isOnline={isOnline}
                   isAdmin={isAdmin}
                   onInstall={installPWA}
                   onShowPrompt={showInstallPromptFn}
                 />
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

      <main className="container py-4 lg:py-8 space-y-6 lg:space-y-8 px-4 lg:px-0">
        <Tabs defaultValue="dashboard">
          <div className="overflow-x-auto">
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 bg-muted/50 p-1 rounded-lg">
            <TabsTrigger value="dashboard" className="gap-1 lg:gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs lg:text-sm">
              <BarChart3 className="h-3 w-3 lg:h-4 lg:w-4" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="today" className="gap-1 lg:gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs lg:text-sm">
              <Calendar className="h-3 w-3 lg:h-4 lg:w-4" /> Hoje
            </TabsTrigger>
            <TabsTrigger value="appointments" className="gap-1 lg:gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs lg:text-sm">
              <Eye className="h-3 w-3 lg:h-4 lg:w-4" /> Agendamentos
            </TabsTrigger>
            <TabsTrigger value="financial" className="gap-1 lg:gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs lg:text-sm">
              <DollarSign className="h-3 w-3 lg:h-4 lg:w-4" /> Financeiro
            </TabsTrigger>
            <TabsTrigger value="services" className="gap-1 lg:gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs lg:text-sm">
              <Scissors className="h-3 w-3 lg:h-4 lg:w-4" /> Serviços
            </TabsTrigger>
            <TabsTrigger value="pros" className="gap-1 lg:gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs lg:text-sm">
              <Users2 className="h-3 w-3 lg:h-4 lg:w-4" /> Profissionais
            </TabsTrigger>
            <TabsTrigger value="hours" className="gap-1 lg:gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs lg:text-sm">
              <Clock className="h-3 w-3 lg:h-4 lg:w-4" /> Horários
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1 lg:gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs lg:text-sm">
              <Settings className="h-3 w-3 lg:h-4 lg:w-4" /> Configurações
            </TabsTrigger>
          </TabsList>
          </div>

          <TabsContent value="dashboard" className="mt-4 lg:mt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-4 lg:space-y-6"
            >
              {/* Métricas */}
              <div className="grid gap-3 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Serviços Ativos</CardTitle>
                    <Scissors className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl lg:text-2xl font-bold">{metrics.services}</div>
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
                    <div className="text-xl lg:text-2xl font-bold">{metrics.pros}</div>
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
                    <div className="text-xl lg:text-2xl font-bold">{metrics.upcoming}</div>
                    <p className="text-xs text-muted-foreground">
                      Próximos agendamentos
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Informações do Plano */}
              {selectedTenant && (
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="h-5 w-5" />
                      Plano Atual
                    </CardTitle>
                    <CardDescription>
                      Informações sobre seu plano de assinatura
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">Plano: {selectedTenant.plan_tier || 'essential'}</p>
                        <p className="text-xs text-muted-foreground">
                          Status: {selectedTenant.plan_status || 'unpaid'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Badge variant={selectedTenant.plan_status === 'active' ? 'default' : 'secondary'} className="flex-1 sm:flex-none">
                          {selectedTenant.plan_status === 'active' ? 'Ativo' : 'Pendente'}
                        </Badge>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={fetchTenants}
                          className="h-8 w-8 flex-shrink-0"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

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
                    <div className="flex flex-col gap-2">
                      <Input
                        id="booking-url"
                        value={getPublicBookingUrl()}
                        readOnly
                        className="font-mono text-xs lg:text-sm"
                      />
                      <div className="flex flex-wrap gap-2">
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
                          className="shrink-0 flex-1 sm:flex-none"
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">Ir para Agendamento</span>
                          <span className="sm:hidden">Abrir</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              
            </motion.div>
          </TabsContent>

          <TabsContent value="today" className="mt-4 lg:mt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {selectedTenantId ? (
                <DailyAppointments 
                  tenantId={selectedTenantId} 
                />
              ) : (
                <Card className="border-0 shadow-lg">
                  <CardContent className="text-center py-8">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Selecione um estabelecimento para ver os agendamentos de hoje.</p>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </TabsContent>

          <TabsContent value="appointments" className="mt-4 lg:mt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {selectedTenantId ? (
                <AppointmentsTable 
                  appointments={appointments} 
                  tenantId={selectedTenantId}
                  onAppointmentUpdate={fetchAppointments}
                />
              ) : (
                <Card className="border-0 shadow-lg">
                  <CardContent className="text-center py-8">
                    <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Selecione um estabelecimento para ver todos os agendamentos.</p>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </TabsContent>

          <TabsContent value="financial" className="mt-4 lg:mt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {selectedTenantId ? (
                checkFeatureAccess(selectedTenant?.plan_tier, 'hasFinancialDashboard') ? (
                  <FinancialDashboard 
                    tenantId={selectedTenantId}
                    planTier={selectedTenant?.plan_tier || null}
                  />
                ) : (
                  <UpgradePrompt
                    requiredPlan="professional"
                    featureName="Dashboard Financeiro"
                    currentPlan={selectedTenant?.plan_tier}
                  />
                )
              ) : (
                <Card className="border-0 shadow-lg">
                  <CardContent className="text-center py-8">
                    <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Selecione um estabelecimento para ver o dashboard financeiro.</p>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </TabsContent>

          <TabsContent value="services" className="mt-4 lg:mt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scissors className="h-5 w-5" />
                    Cadastrar Serviços
                  </CardTitle>
                  <CardDescription>
                    Cadastre seus serviços e valores. Os preços devem ser informados em reais.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                                     <form onSubmit={serviceForm.handleSubmit(onCreateService)} className="space-y-6 lg:space-y-8">
                     <div className="grid gap-4 lg:gap-6 grid-cols-1 md:grid-cols-2">
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

                                         <div className="grid gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
                       <Button type="submit" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 h-12 px-4 lg:px-8 w-full sm:w-auto">
                         <Plus className="mr-2 h-5 w-5" />
                         <span className="hidden sm:inline">Cadastrar Serviço</span>
                         <span className="sm:hidden">Cadastrar</span>
                       </Button>
                     </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

                     <TabsContent value="pros" className="mt-4 lg:mt-6">
             <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.5 }}
               className="space-y-6"
             >
               {selectedTenantId ? (
                 <>
                   {/* Check professional limit */}
                   {canAddProfessional(selectedTenant?.plan_tier, professionals.length) ? (
                     <>
                       {/* Formulário de Cadastro */}
                       <Card className="border-0 shadow-lg">
                         <CardHeader>
                           <CardTitle className="flex items-center gap-2">
                             <Users2 className="h-5 w-5" />
                             Cadastrar Profissionais
                           </CardTitle>
                           <CardDescription>
                             Inclua os profissionais do seu time e suas especialidades.
                           </CardDescription>
                         </CardHeader>
                         <CardContent>
                           <form onSubmit={proForm.handleSubmit(onCreatePro)} className="space-y-6 lg:space-y-8">
                             <div className="grid gap-4 lg:gap-6 grid-cols-1 md:grid-cols-2">
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

                             <div className="grid gap-4 lg:gap-6 grid-cols-1 md:grid-cols-2">
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
                               <Button type="submit" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 h-12 px-4 lg:px-8 w-full sm:w-auto">
                                 <Plus className="mr-2 h-5 w-5" />
                                 <span className="hidden sm:inline">Cadastrar Profissional</span>
                                 <span className="sm:hidden">Cadastrar</span>
                               </Button>
                             </div>
                           </form>
                         </CardContent>
                       </Card>
                     </>
                   ) : (
                     <UpgradePrompt
                       requiredPlan={selectedTenant?.plan_tier === 'essential' ? 'professional' : 'premium'}
                       featureName="Mais Profissionais"
                       currentPlan={selectedTenant?.plan_tier}
                     />
                   )}

                   {/* Tabela de Profissionais */}
                   <ProfessionalsTable 
                     professionals={professionals} 
                     tenantId={selectedTenantId}
                     onProfessionalUpdate={fetchProfessionals}
                   />
                 </>
               ) : (
                 <Card className="border-0 shadow-lg">
                   <CardContent className="text-center py-8">
                     <Users2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                     <p className="text-muted-foreground">Selecione um estabelecimento para gerenciar profissionais.</p>
                   </CardContent>
                 </Card>
               )}
             </motion.div>
           </TabsContent>

          <TabsContent value="hours" className="mt-4 lg:mt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {selectedTenantId ? (
                <div className="space-y-6">
                  <BusinessHoursManager tenantId={selectedTenantId} />
                  <AutoConfirmationManager planTier={selectedTenant?.plan_tier} />
                </div>
              ) : (
                <Card className="border-0 shadow-lg">
                  <CardContent className="text-center py-8">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Selecione um estabelecimento para configurar horários.</p>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </TabsContent>

          <TabsContent value="settings" className="mt-4 lg:mt-6">
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
                                                                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
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

                       <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                         <div className="space-y-2">
                           <Label className="text-sm font-medium">Tema do Estabelecimento</Label>
                           <Select 
                             defaultValue={selectedTenant.theme_variant || 'barber'}
                             onValueChange={async (value) => {
                               const { error } = await supabase
                                 .from("tenants")
                                 .update({ theme_variant: value })
                                 .eq("id", selectedTenant.id);
                               if (error) {
                                 toast({ title: "Erro ao atualizar tema", description: error.message });
                               } else {
                                 toast({ title: "Tema atualizado com sucesso!" });
                                 fetchTenants();
                               }
                             }}
                           >
                             <SelectTrigger className="h-10">
                               <SelectValue placeholder="Escolha o tema" />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="barber">Barbearia (Tema Masculino)</SelectItem>
                               <SelectItem value="salon">Salão (Tema Feminino)</SelectItem>
                             </SelectContent>
                           </Select>
                           <p className="text-xs text-muted-foreground">
                             Escolha o tema visual do seu estabelecimento
                           </p>
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
                       </div>

                       <div className="flex justify-end">
                         <Button type="submit" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 w-full sm:w-auto">
                           <Settings className="mr-2 h-4 w-4" />
                           <span className="hidden sm:inline">Salvar Configurações</span>
                           <span className="sm:hidden">Salvar</span>
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

       {/* PWA Install Prompt */}
       <PWAInstallPrompt
         isVisible={showInstallPrompt}
         isOnline={isOnline}
         isAdmin={isAdmin}
         onInstall={installPWA}
         onClose={hideInstallPrompt}
       />
     </div>
   );
 }