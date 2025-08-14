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
import ServicesTable from "@/components/ServicesTable";
import UpgradePrompt from "@/components/UpgradePrompt";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { PWAStatus } from "@/components/PWAStatus";
import { MobileSidebar } from "@/components/MobileSidebar";
import { DesktopSidebar } from "@/components/DesktopSidebar";
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
    plan: 'essential' | 'professional' | 'premium';
  }>>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({ services: 0, pros: 0, upcoming: 0 });
  const [copied, setCopied] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
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
    setTenants((data ?? []).map(tenant => ({
      ...tenant,
      plan: (tenant.plan_tier as 'essential' | 'professional' | 'premium') || 'essential'
    })));
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
      fetchServices();
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

  const fetchServices = async () => {
    if (!selectedTenantId) return;

    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('tenant_id', selectedTenantId)
        .order('name');

      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar serviços:', error);
      toast({
        title: 'Erro ao carregar serviços',
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
    setTenants((data ?? []).map(tenant => ({
      ...tenant,
      plan: (tenant.plan_tier as 'essential' | 'professional' | 'premium') || 'essential'
    })));
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
      fetchServices();
    }
  };

  const onCreatePro = async (values: ProForm) => {
    // Verificar se o tenant_id existe nos tenants do usuário
    const selectedTenant = tenants.find(t => t.id === values.tenant_id);
    if (!selectedTenant) {
      toast({
        title: "Erro ao criar profissional",
        description: "Estabelecimento selecionado inválido",
        variant: 'destructive'
      });
      return;
    }

    // Verificar limite de profissionais baseado no plano
    try {
      // Usar uma query mais específica para evitar ambiguidade
      const { data: existingProfessionals, error: countError } = await supabase
        .from("professionals")
        .select("id")
        .eq("tenant_id", values.tenant_id)
        .eq("active", true);

      if (countError) {
        console.error('Erro ao contar profissionais:', countError);
        toast({
          title: "Erro ao verificar limites",
          description: "Não foi possível verificar o limite de profissionais",
          variant: 'destructive'
        });
        return;
      }

      const currentCount = existingProfessionals?.length || 0;

      const limits = {
        essential: 1,
        professional: 3,
        premium: 999
      };

      const maxAllowed = limits[selectedTenant.plan as keyof typeof limits] || 1;

      if (currentCount >= maxAllowed) {
        toast({
          title: "Limite atingido",
          description: `Seu plano ${selectedTenant.plan_tier} permite no máximo ${maxAllowed} profissional(is). Faça upgrade para adicionar mais.`,
          variant: 'destructive'
        });
        return;
      }

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
      
      // Resetar para o tenant selecionado
      if (selectedTenantId) {
        proForm.setValue("tenant_id", selectedTenantId);
        fetchProfessionals();
      }
    } catch (error: any) {
      toast({
        title: "Erro ao verificar limites",
        description: error.message,
        variant: 'destructive'
      });
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
      {/* Desktop Sidebar */}
      <DesktopSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
        isOnline={isOnline}
        isAdmin={isAdmin}
        onInstall={installPWA}
        onShowPrompt={showInstallPromptFn}
        onSignOut={handleSignOut}
        selectedTenant={selectedTenant}
        tenants={tenants}
        onTenantChange={setSelectedTenantId}
      />

      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50 lg:ml-64">
        <div className="container flex items-center justify-between py-4 gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4 w-full"
          >
            {/* Mobile Sidebar Toggle */}
            <MobileSidebar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              isInstallable={isInstallable}
              isInstalled={isInstalled}
              isOnline={isOnline}
              isAdmin={isAdmin}
              onInstall={installPWA}
              onShowPrompt={showInstallPromptFn}
              onSignOut={handleSignOut}
              selectedTenant={selectedTenant}
              tenants={tenants}
              onTenantChange={setSelectedTenantId}
            />

            {/* Desktop Logo and Title */}
            <div className="hidden lg:flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden">
                <img
                  src="/style_swift_logo_no_bg.png"
                  alt="StyleSwift Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold">StyleSwift Admin</h1>
                <p className="text-muted-foreground text-sm">Bem-vindo, {user.email}</p>
              </div>
            </div>

            {/* Mobile Title */}
            <div className="lg:hidden">
              <h1 className="text-lg font-bold">StyleSwift</h1>
              <p className="text-muted-foreground text-xs">Admin</p>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2 ml-auto">
              <ThemeToggle />
              <Button variant="outline" size="sm" onClick={handleSignOut} className="hidden lg:flex">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </motion.div>
        </div>
      </header>

      <main className="lg:ml-64">
        <div className="container py-4 lg:py-8 space-y-6 lg:space-y-8 px-4 lg:px-6 lg:pt-20">

          {/* Content based on active tab */}
          {activeTab === 'dashboard' && (
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
                        <div className="flex items-center gap-2">
                          {/* Lógica para a Badge do Plano: Apenas o tipo do plano é exibido. */}
                          <Badge
                            variant={
                              selectedTenant.plan_tier === 'essential' ? 'secondary' :
                                selectedTenant.plan_tier === 'professional' ? 'default' :
                                  'default'
                            }
                          >
                            {selectedTenant.plan_tier === 'essential' ? 'Essencial' :
                              selectedTenant.plan_tier === 'professional' ? 'Profissional' :
                                selectedTenant.plan_tier === 'premium' ? 'Premium' : 'Gratuito'}
                          </Badge>

                          {/* Lógica para a Badge do Status: Usa 'active' para sucesso e 'unpaid' para falha. */}
                          <Badge variant={selectedTenant.plan_status === 'active' ? 'default' : 'destructive'}>
                            {selectedTenant.plan_status === 'active' ? 'Ativo' : 'Não Pago'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedTenant.plan_tier === 'essential' ? 'Plano básico para pequenos estabelecimentos' :
                            selectedTenant.plan_tier === 'professional' ? 'Plano intermediário com recursos avançados' :
                              selectedTenant.plan_tier === 'premium' ? 'Plano completo com todos os recursos' : 'Plano gratuito limitado'}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => navigate('/subscription')}>
                        <Crown className="h-4 w-4 mr-2" />
                        Gerenciar Assinatura
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Link de Agendamento */}
              {selectedTenant && (
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ExternalLink className="h-5 w-5" />
                      Link de Agendamento
                    </CardTitle>
                    <CardDescription>
                      Compartilhe este link para que seus clientes possam fazer agendamentos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Input
                          value={getPublicBookingUrl()}
                          readOnly
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyLink}
                          className="shrink-0"
                        >
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleOpenLink}
                          className="shrink-0"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleGoToBookingPage} className="flex-1">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Ver Página de Agendamento
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}

          {activeTab === 'today' && (
            <DailyAppointments
              tenantId={selectedTenantId}
            />
          )}

          {activeTab === 'appointments' && (
            <AppointmentsTable
              appointments={appointments}
              tenantId={selectedTenantId}
              onAppointmentUpdate={fetchAppointments}
            />
          )}

          {activeTab === 'financial' && (
            <FinancialDashboard
              tenantId={selectedTenantId}
              planTier={selectedTenant?.plan_tier}
            />
          )}

          {activeTab === 'services' && (
            <div className="space-y-6">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Criar Novo Serviço
                  </CardTitle>
                  <CardDescription>
                    Adicione um novo serviço ao seu estabelecimento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={serviceForm.handleSubmit(onCreateService)} className="space-y-4">
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome do Serviço</Label>
                        <Input
                          id="name"
                          {...serviceForm.register("name")}
                          placeholder="Ex: Corte de Cabelo"
                          className="h-10"
                        />
                        {serviceForm.formState.errors.name && (
                          <p className="text-xs text-red-500">{serviceForm.formState.errors.name.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="price_reais">Preço (R$)</Label>
                        <Input
                          id="price_reais"
                          type="number"
                          step="0.01"
                          {...serviceForm.register("price_reais")}
                          placeholder="0.00"
                          className="h-10"
                        />
                        {serviceForm.formState.errors.price_reais && (
                          <p className="text-xs text-red-500">{serviceForm.formState.errors.price_reais.message}</p>
                        )}
                      </div>
                    </div>
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="duration_minutes">Duração (minutos)</Label>
                        <Input
                          id="duration_minutes"
                          type="number"
                          {...serviceForm.register("duration_minutes")}
                          placeholder="30"
                          className="h-10"
                        />
                        {serviceForm.formState.errors.duration_minutes && (
                          <p className="text-xs text-red-500">{serviceForm.formState.errors.duration_minutes.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Descrição (opcional)</Label>
                        <Input
                          id="description"
                          {...serviceForm.register("description")}
                          placeholder="Descrição detalhada do serviço"
                          className="h-10"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 w-full sm:w-auto">
                      <Plus className="mr-2 h-4 w-4" />
                      Criar Serviço
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <ServicesTable
                services={services}
                tenantId={selectedTenantId}
                onServiceUpdate={fetchServices}
              />
            </div>
          )}

          {activeTab === 'pros' && (
            <div className="space-y-6">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Adicionar Profissional
                  </CardTitle>
                  <CardDescription>
                    Adicione um novo profissional ao seu estabelecimento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={proForm.handleSubmit(onCreatePro)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="tenant_select">Estabelecimento</Label>
                      <Select
                        onValueChange={(value) => proForm.setValue("tenant_id", value)}
                        defaultValue={selectedTenantId || ""}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Selecione o estabelecimento" />
                        </SelectTrigger>
                        <SelectContent>
                          {tenants.map((tenant) => (
                            <SelectItem key={tenant.id} value={tenant.id}>
                              {tenant.name} ({tenant.plan_tier})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {proForm.formState.errors.tenant_id && (
                        <p className="text-xs text-red-500">{proForm.formState.errors.tenant_id.message}</p>
                      )}
                    </div>
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="pro_name">Nome do Profissional</Label>
                        <Input
                          id="pro_name"
                          {...proForm.register("name")}
                          placeholder="Ex: João Silva"
                          className="h-10"
                        />
                        {proForm.formState.errors.name && (
                          <p className="text-xs text-red-500">{proForm.formState.errors.name.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="avatar_url">URL do Avatar (opcional)</Label>
                        <Input
                          id="avatar_url"
                          {...proForm.register("avatar_url")}
                          placeholder="https://exemplo.com/avatar.jpg"
                          className="h-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio">Biografia (opcional)</Label>
                      <Input
                        id="bio"
                        {...proForm.register("bio")}
                        placeholder="Breve descrição sobre o profissional"
                        className="h-10"
                      />
                    </div>
                    <Button type="submit" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 w-full sm:w-auto">
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Profissional
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <ProfessionalsTable
                professionals={professionals}
                tenantId={selectedTenantId}
                onProfessionalUpdate={fetchProfessionals}
                planTier={selectedTenant?.plan_tier}
              />
            </div>
          )}

          {activeTab === 'hours' && (
            <div className="space-y-6">
              <BusinessHoursManager tenantId={selectedTenantId} />
              <AutoConfirmationManager planTier={selectedTenant?.plan_tier} tenantId={selectedTenantId} />
            </div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >

              {selectedTenant ? (
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Configurar Estabelecimento
                    </CardTitle>
                    <CardDescription>
                      Configure as informações do estabelecimento selecionado
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form className="space-y-6">
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
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Selecione um estabelecimento para configurar.</p>
                </div>
              )}
            </motion.div>
          )}
        </div>
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