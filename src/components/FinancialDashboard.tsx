import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, DollarSign, Calendar, User, Scissors, BarChart3, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { checkFeatureAccess } from "@/config/plans";
import UpgradePrompt from "@/components/UpgradePrompt";

interface FinancialDashboardProps {
  tenantId: string;
  planTier: string | null;
}

interface RevenueData {
  date: string;
  revenue: number;
  appointments: number;
}

interface ProfessionalRevenue {
  name: string;
  revenue: number;
  appointments: number;
}

interface ServiceRevenue {
  name: string;
  revenue: number;
  count: number;
}

export default function FinancialDashboard({ tenantId, planTier }: FinancialDashboardProps) {
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [professionalRevenue, setProfessionalRevenue] = useState<ProfessionalRevenue[]>([]);
  const [serviceRevenue, setServiceRevenue] = useState<ServiceRevenue[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [period, setPeriod] = useState<'7' | '30' | '90'>('30');
  const [selectedProfessional, setSelectedProfessional] = useState<string>('all');
  const [professionals, setProfessionals] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [growth, setGrowth] = useState<number | null>(null);

  const isAdvanced = planTier === 'premium';
  
  // Verificar acesso ao dashboard financeiro
  const hasFinancialAccess = checkFeatureAccess('financial_dashboard', planTier);

  useEffect(() => {
    if (tenantId) {
      fetchProfessionals();
      fetchRevenueData();
    }
  }, [tenantId, period, selectedProfessional]);

  const fetchProfessionals = async () => {
    const { data, error } = await supabase
      .from("professionals")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .eq("active", true)
      .order("name");

    if (error) {
      console.error("Erro ao buscar profissionais:", error);
      return;
    }

    setProfessionals(data || []);
  };

  const fetchRevenueData = async () => {
    setLoading(true);
    try {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(period));

      let query = supabase
        .from("appointments")
        .select(`
          *,
          services!inner(name, price_cents),
          professionals(name)
        `)
        .eq("tenant_id", tenantId)
        .eq("status", "concluido")
        .gte("start_time", daysAgo.toISOString())
        .order("start_time");

      if (selectedProfessional !== 'all') {
        query = query.eq("professional_id", selectedProfessional);
      }

      const { data: appointments, error } = await query;

      if (error) {
        toast({
          title: "Erro ao carregar dados",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      // Processar dados para o gráfico
      const revenueByDate = appointments?.reduce((acc: any, appointment: any) => {
        const date = new Date(appointment.start_time).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { revenue: 0, appointments: 0 };
        }
        acc[date].revenue += appointment.services.price_cents / 100;
        acc[date].appointments += 1;
        return acc;
      }, {});

      const chartData = Object.entries(revenueByDate || {}).map(([date, data]: [string, any]) => ({
        date,
        revenue: data.revenue,
        appointments: data.appointments
      }));

      setRevenueData(chartData);
      const total = chartData.reduce((sum, item) => sum + item.revenue, 0);
      setTotalRevenue(total);

      // Calcular crescimento (comparar com período anterior)
      const previousPeriod = new Date();
      previousPeriod.setDate(previousPeriod.getDate() - parseInt(period) * 2);
      previousPeriod.setDate(previousPeriod.getDate() + parseInt(period));

      const { data: previousData } = await supabase
        .from("appointments")
        .select(`services!inner(price_cents)`)
        .eq("tenant_id", tenantId)
        .eq("status", "concluido")
        .gte("start_time", previousPeriod.toISOString())
        .lt("start_time", daysAgo.toISOString());

      const previousTotal = previousData?.reduce((sum, appointment) => 
        sum + appointment.services.price_cents / 100, 0) || 0;

      if (previousTotal > 0) {
        const growthPercent = ((total - previousTotal) / previousTotal) * 100;
        setGrowth(growthPercent);
      }

      // Receita por profissional (apenas no plano avançado)
      if (isAdvanced) {
        const revenueByProfessional = appointments?.reduce((acc: any, appointment: any) => {
          const profName = appointment.professionals?.name || 'Sem profissional';
          if (!acc[profName]) {
            acc[profName] = { revenue: 0, appointments: 0 };
          }
          acc[profName].revenue += appointment.services.price_cents / 100;
          acc[profName].appointments += 1;
          return acc;
        }, {});

        const profData = Object.entries(revenueByProfessional || {}).map(([name, data]: [string, any]) => ({
          name,
          revenue: data.revenue,
          appointments: data.appointments
        }));

        setProfessionalRevenue(profData);

        // Receita por serviço
        const revenueByService = appointments?.reduce((acc: any, appointment: any) => {
          const serviceName = appointment.services.name;
          if (!acc[serviceName]) {
            acc[serviceName] = { revenue: 0, count: 0 };
          }
          acc[serviceName].revenue += appointment.services.price_cents / 100;
          acc[serviceName].count += 1;
          return acc;
        }, {});

        const serviceData = Object.entries(revenueByService || {}).map(([name, data]: [string, any]) => ({
          name,
          revenue: data.revenue,
          count: data.count
        }));

        setServiceRevenue(serviceData);
      }

    } catch (error) {
      console.error("Erro ao buscar dados de receita:", error);
    } finally {
      setLoading(false);
    }
  };

  // Se não tem acesso, mostrar prompt de upgrade
  if (!hasFinancialAccess) {
    return (
      <UpgradePrompt
        requiredPlan="professional"
        featureName="Dashboard Financeiro"
        currentPlan={planTier}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Dashboard Financeiro
            {isAdvanced && (
              <Badge variant="secondary" className="ml-2">
                Avançado
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Acompanhe o desempenho financeiro do seu estabelecimento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium">Período</label>
              <Select value={period} onValueChange={(value: '7' | '30' | '90') => setPeriod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {isAdvanced && professionals.length > 0 && (
              <div className="flex-1">
                <label className="text-sm font-medium">Profissional</label>
                <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os profissionais</SelectItem>
                    {professionals.map((prof) => (
                      <SelectItem key={prof.id} value={prof.id}>
                        {prof.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-end">
              <Button onClick={fetchRevenueData} disabled={loading} variant="outline">
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBRL(totalRevenue * 100)}</div>
            {growth !== null && (
              <p className={`text-xs flex items-center gap-1 ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {growth >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(growth).toFixed(1)}% vs período anterior
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendamentos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {revenueData.reduce((sum, item) => sum + item.appointments, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Últimos {period} dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <Scissors className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBRL(
                revenueData.reduce((sum, item) => sum + item.appointments, 0) > 0
                  ? (totalRevenue / revenueData.reduce((sum, item) => sum + item.appointments, 0)) * 100
                  : 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Por agendamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Diária</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBRL(
                revenueData.length > 0
                  ? (totalRevenue / revenueData.length) * 100
                  : 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Média do período
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de receita */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução da Receita</CardTitle>
          <CardDescription>
            Receita diária nos últimos {period} dias
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
                  formatter={(value: number, name: string) => [
                    name === 'revenue' ? formatBRL(value * 100) : value,
                    name === 'revenue' ? 'Receita' : 'Agendamentos'
                  ]}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Receita (R$)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Relatórios avançados (apenas no plano Premium) */}
      {isAdvanced && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Receita por profissional */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Receita por Profissional
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {professionalRevenue.map((prof, index) => (
                  <motion.div
                    key={prof.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{prof.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {prof.appointments} agendamentos
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatBRL(prof.revenue * 100)}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Receita por serviço */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scissors className="h-5 w-5" />
                Receita por Serviço
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {serviceRevenue.map((service, index) => (
                  <motion.div
                    key={service.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {service.count} realizados
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatBRL(service.revenue * 100)}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}