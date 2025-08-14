import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import RevenueChart from '@/components/RevenueChart';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Calendar,
  BarChart3,
  Lock,
  Crown
} from 'lucide-react';
import { formatBRL } from '@/lib/utils';
import UpgradePrompt from '@/components/UpgradePrompt';

interface FinancialDashboardProps {
  tenantId: string;
  planTier?: string;
}

interface RevenueData {
  date: string;
  revenue: number;
  appointments: number;
}

interface ProfessionalRevenue {
  professional_name: string;
  revenue: number;
  appointments: number;
}

interface ServiceRevenue {
  service_name: string;
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

  // Usar hook de permissões
  const { canAccessFinancialDashboard, planLimits, isLoading: permissionsLoading } = usePermissions(tenantId);

  useEffect(() => {
    if (tenantId && canAccessFinancialDashboard) {
      fetchProfessionals();
      fetchRevenueData();
    }
  }, [tenantId, period, selectedProfessional, canAccessFinancialDashboard]);

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
      const days = parseInt(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Buscar agendamentos concluídos no período
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          *,
          services(name, price_cents),
          professionals(name)
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'concluido')
        .gte('start_time', startDate.toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Processar dados de receita
      const revenueByDate: { [key: string]: RevenueData } = {};
      const revenueByProfessional: { [key: string]: ProfessionalRevenue } = {};
      const revenueByService: { [key: string]: ServiceRevenue } = {};
      let total = 0;

      appointments?.forEach(appointment => {
        const date = new Date(appointment.start_time).toISOString().split('T')[0];
        const revenue = appointment.services?.price_cents || 0;
        const professionalName = appointment.professionals?.name || 'Sem profissional';
        const serviceName = appointment.services?.name || 'Serviço não especificado';

        // Receita por data
        if (!revenueByDate[date]) {
          revenueByDate[date] = { date, revenue: 0, appointments: 0 };
        }
        revenueByDate[date].revenue += revenue;
        revenueByDate[date].appointments += 1;

        // Receita por profissional
        if (!revenueByProfessional[professionalName]) {
          revenueByProfessional[professionalName] = { professional_name: professionalName, revenue: 0, appointments: 0 };
        }
        revenueByProfessional[professionalName].revenue += revenue;
        revenueByProfessional[professionalName].appointments += 1;

        // Receita por serviço
        if (!revenueByService[serviceName]) {
          revenueByService[serviceName] = { service_name: serviceName, revenue: 0, count: 0 };
        }
        revenueByService[serviceName].revenue += revenue;
        revenueByService[serviceName].count += 1;

        total += revenue;
      });

      // Filtrar por profissional selecionado
      const filteredRevenueByDate = selectedProfessional === 'all' 
        ? Object.values(revenueByDate)
        : Object.values(revenueByDate).filter(item => {
            const appointmentsForDate = appointments?.filter(app => {
              const appDate = new Date(app.start_time).toISOString().split('T')[0];
              const appProfessional = app.professionals?.name || 'Sem profissional';
              return appDate === item.date && appProfessional === selectedProfessional;
            });
            return appointmentsForDate && appointmentsForDate.length > 0;
          });

      setRevenueData(filteredRevenueByDate);
      setProfessionalRevenue(Object.values(revenueByProfessional));
      setServiceRevenue(Object.values(revenueByService));
      setTotalRevenue(total);

      // Calcular crescimento
      if (filteredRevenueByDate.length >= 2) {
        const recent = filteredRevenueByDate.slice(-7).reduce((sum, item) => sum + item.revenue, 0);
        const previous = filteredRevenueByDate.slice(-14, -7).reduce((sum, item) => sum + item.revenue, 0);
        const growthRate = previous > 0 ? ((recent - previous) / previous) * 100 : 0;
        setGrowth(growthRate);
      }

    } catch (error) {
      console.error('Erro ao buscar dados de receita:', error);
    } finally {
      setLoading(false);
    }
  };

  // Se não tem acesso ao dashboard financeiro, mostrar prompt de upgrade
  if (!permissionsLoading && !canAccessFinancialDashboard) {
    return (
      <UpgradePrompt
        requiredPlan="professional"
        featureName="Dashboard Financeiro"
        currentPlan={planTier || 'essential'}
      />
    );
  }

  if (permissionsLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com controles */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Dashboard Financeiro
          </h2>
          <p className="text-muted-foreground">
            Acompanhe sua receita e performance
          </p>
        </div>
        
        <div className="flex gap-2">
          <Select value={period} onValueChange={(value: '7' | '30' | '90') => setPeriod(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todos os profissionais" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os profissionais</SelectItem>
              {professionals.map(prof => (
                <SelectItem key={prof.id} value={prof.name}>{prof.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards de métricas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBRL(totalRevenue)}</div>
            {growth !== null && (
              <div className={`flex items-center text-xs ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {growth >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {Math.abs(growth).toFixed(1)}%
              </div>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {revenueData.reduce((sum, item) => sum + item.appointments, 0) > 0
                ? formatBRL(totalRevenue / revenueData.reduce((sum, item) => sum + item.appointments, 0))
                : formatBRL(0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plano Atual</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{planTier || 'essential'}</div>
            <Badge variant="secondary" className="mt-1">
              {planLimits.has_financial_dashboard ? 'Dashboard Ativo' : 'Dashboard Bloqueado'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de receita */}
      <Card>
        <CardHeader>
          <CardTitle>Receita por Período</CardTitle>
          <CardDescription>
            Evolução da receita nos últimos {period} dias
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RevenueChart 
            data={revenueData} 
            totalRevenue={totalRevenue}
            period={period}
          />
        </CardContent>
      </Card>

      {/* Receita por profissional e serviço */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Receita por Profissional</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {professionalRevenue.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{item.professional_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.appointments} agendamentos
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatBRL(item.revenue)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receita por Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {serviceRevenue.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{item.service_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.count} vendas
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatBRL(item.revenue)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}