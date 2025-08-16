import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RevenueChart from '@/components/RevenueChart';
import HeatmapChart from '@/components/HeatmapChart';
import PieChart from '@/components/PieChart';
import ComparisonChart from '@/components/ComparisonChart';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { usePermissionsSimplified } from '@/hooks/usePermissionsSimplified';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Calendar,
  BarChart,
  Lock,
  Crown,
  RefreshCw,
  Target,
  Award,
  Clock,
  Star,
  FileText,
  Activity,
  PieChart as PieChartIcon
} from 'lucide-react';
import { formatBRL } from '@/lib/utils';
import UpgradePrompt from '@/components/UpgradePrompt';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AnimatedContainer, AnimatedItem, AnimatedCard, AnimatedBadge, AnimatedProgress, AnimatedSpinner } from '@/components/MicroInteractions';
import { TactileCard } from '@/components/TactileFeedback';
import { Skeleton, DashboardSkeleton } from '@/components/Skeleton';

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

interface HeatmapData {
  hour: number;
  day: string;
  count: number;
  revenue: number;
}

interface PieData {
  label: string;
  value: number;
  color: string;
  percentage: number;
}

interface ComparisonData {
  current: number;
  previous: number;
  label: string;
  color: string;
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
  const [refreshing, setRefreshing] = useState(false);
  
  // Novos estados para gráficos adicionais
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [pieData, setPieData] = useState<PieData[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
  const [previousPeriodData, setPreviousPeriodData] = useState<RevenueData[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>('professionals');

  // Usar hook de permissões (testando versão simplificada)
  const permissionsOriginal = usePermissions(tenantId);
  const permissionsSimplified = usePermissionsSimplified(tenantId);
  
  // Usar versão simplificada para teste, mas manter logs para comparação
  console.log('Comparação de permissões:', {
    original: {
      canAccess: permissionsOriginal.canAccessFinancialDashboard,
      planTier: permissionsOriginal.planLimits,
      loading: permissionsOriginal.isLoading
    },
    simplified: {
      canAccess: permissionsSimplified.canAccessFinancialDashboard,
      planTier: permissionsSimplified.planTier,
      loading: permissionsSimplified.isLoading
    }
  });
  
  const { canAccessFinancialDashboard, planLimits, isLoading: permissionsLoading, canUseAdvancedAnalytics } = permissionsSimplified;
  
  // Verificar se o usuário pode acessar recursos premium
  const canAccessPremiumFeatures = planTier === 'premium';
  
  // Redirecionar para aba disponível se tentar acessar premium sem permissão
  useEffect(() => {
    if (!canAccessPremiumFeatures && (selectedTab === 'heatmap' || selectedTab === 'comparison')) {
      setSelectedTab('professionals');
    }
  }, [canAccessPremiumFeatures, selectedTab]);

  useEffect(() => {
    if (tenantId && canAccessFinancialDashboard) {
      fetchProfessionals();
      fetchRevenueData();
    }
  }, [tenantId, period, selectedProfessional, canAccessFinancialDashboard]);

  const fetchProfessionals = async () => {
    try {
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
    } catch (error) {
      console.error("Erro ao buscar profissionais:", error);
    }
  };

  const fetchRevenueData = async () => {
    setLoading(true);
    try {
      const days = parseInt(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Buscar agendamentos concluídos no período atual
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

      // Buscar dados do período anterior para comparação
      const previousStartDate = new Date(startDate);
      previousStartDate.setDate(previousStartDate.getDate() - days);
      
      const { data: previousAppointments } = await supabase
        .from('appointments')
        .select(`
          *,
          services(name, price_cents),
          professionals(name)
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'concluido')
        .gte('start_time', previousStartDate.toISOString())
        .lt('start_time', startDate.toISOString())
        .order('start_time', { ascending: true });

      // Processar dados de receita
      const revenueByDate: { [key: string]: RevenueData } = {};
      const revenueByProfessional: { [key: string]: ProfessionalRevenue } = {};
      const revenueByService: { [key: string]: ServiceRevenue } = {};
      const heatmapByHourDay: { [key: string]: HeatmapData } = {};
      let total = 0;

      appointments?.forEach(appointment => {
        const date = new Date(appointment.start_time).toISOString().split('T')[0];
        const hour = new Date(appointment.start_time).getHours();
        const dayOfWeek = new Date(appointment.start_time).toLocaleDateString('pt-BR', { weekday: 'long' });
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

        // Heatmap por hora e dia
        const heatmapKey = `${dayOfWeek}-${hour}`;
        if (!heatmapByHourDay[heatmapKey]) {
          heatmapByHourDay[heatmapKey] = { hour, day: dayOfWeek, count: 0, revenue: 0 };
        }
        heatmapByHourDay[heatmapKey].count += 1;
        heatmapByHourDay[heatmapKey].revenue += revenue;

        total += revenue;
      });

      // Processar dados do período anterior
      const previousRevenueByDate: { [key: string]: RevenueData } = {};
      previousAppointments?.forEach(appointment => {
        const date = new Date(appointment.start_time).toISOString().split('T')[0];
        const revenue = appointment.services?.price_cents || 0;
        
        if (!previousRevenueByDate[date]) {
          previousRevenueByDate[date] = { date, revenue: 0, appointments: 0 };
        }
        previousRevenueByDate[date].revenue += revenue;
        previousRevenueByDate[date].appointments += 1;
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

      // Preparar dados para gráficos
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'];
      
      // Dados para gráfico de pizza (serviços)
      const pieChartData = Object.values(revenueByService)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 8)
        .map((service, index) => ({
          label: service.service_name,
          value: service.revenue,
          color: colors[index % colors.length],
          percentage: total > 0 ? (service.revenue / total) * 100 : 0
        }));

      // Dados para comparação de períodos
      const currentAppointmentsTotal = Object.values(revenueByDate).reduce((sum, item) => sum + item.appointments, 0);
      const previousAppointmentsTotal = Object.values(previousRevenueByDate).reduce((sum, item) => sum + item.appointments, 0);
      const previousRevenueTotal = Object.values(previousRevenueByDate).reduce((sum, item) => sum + item.revenue, 0);
      
      const comparisonChartData = [
        {
          current: total,
          previous: previousRevenueTotal,
          label: 'Receita Total',
          color: '#3b82f6'
        },
        {
          current: currentAppointmentsTotal,
          previous: previousAppointmentsTotal,
          label: 'Agendamentos',
          color: '#10b981'
        },
        {
          current: currentAppointmentsTotal > 0 ? total / currentAppointmentsTotal : 0,
          previous: previousAppointmentsTotal > 0 ? previousRevenueTotal / previousAppointmentsTotal : 0,
          label: 'Ticket Médio',
          color: '#f59e0b'
        }
      ];

      setRevenueData(filteredRevenueByDate);
      setPreviousPeriodData(Object.values(previousRevenueByDate));
      setProfessionalRevenue(Object.values(revenueByProfessional));
      setServiceRevenue(Object.values(revenueByService));
      setTotalRevenue(total);
      setHeatmapData(Object.values(heatmapByHourDay));
      setPieData(pieChartData);
      setComparisonData(comparisonChartData);

      // Calcular crescimento baseado no período anterior
      if (Object.values(previousRevenueByDate).length > 0) {
        const currentPeriodRevenue = total;
        const previousPeriodRevenue = Object.values(previousRevenueByDate).reduce((sum, item) => sum + item.revenue, 0);
        const growthRate = previousPeriodRevenue > 0 ? ((currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100 : 0;
        setGrowth(growthRate);
      }

    } catch (error) {
      console.error('Erro ao buscar dados de receita:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRevenueData();
    setRefreshing(false);
  };



  const handleGenerateReport = () => {
    if (!canUseAdvancedAnalytics) {
      return;
    }

    // Gerar relatório completo em PDF
    const reportData = {
      periodo: `${period} dias`,
      receitaTotal: formatBRL(totalRevenue),
      totalAgendamentos: totalAppointments,
      ticketMedio: formatBRL(ticketMedio),
      crescimento: growth !== null ? `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%` : 'N/A',
      profissionais: professionalRevenue.map(p => ({
        nome: p.professional_name,
        receita: formatBRL(p.revenue),
        agendamentos: p.appointments,
        percentual: `${((p.revenue / totalRevenue) * 100).toFixed(1)}%`
      })),
      servicos: serviceRevenue.map(s => ({
        nome: s.service_name,
        receita: formatBRL(s.revenue),
        vendas: s.count,
        percentual: `${((s.revenue / totalRevenue) * 100).toFixed(1)}%`
      })),
      dadosDiarios: revenueData.map(d => ({
        data: new Date(d.date).toLocaleDateString('pt-BR'),
        receita: formatBRL(d.revenue),
        agendamentos: d.appointments
      }))
    };

    // Criar HTML para o relatório com design moderno
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Relatório de Receita - StyleSwift</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          body {
            font-family: 'Inter', sans-serif;
          }
        </style>
      </head>
      <body class="bg-gray-100 flex items-center justify-center min-h-screen p-4">
        <div class="bg-white p-8 rounded-2xl shadow-xl w-full max-w-7xl">
          <div class="text-center mb-8">
            <h1 class="text-4xl font-bold text-gray-800 mb-2">📊 Relatório de Receita</h1>
            <p class="text-gray-600">StyleSwift - Sistema de Gestão para Barbearias</p>
            <p class="text-sm text-gray-500 mt-2">Período: ${reportData.periodo} | Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
          </div>

          <!-- Resumo do Período -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div class="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-xl text-white">
              <div class="text-sm font-medium opacity-90">Receita Total</div>
              <div class="text-2xl font-bold mt-1">${reportData.receitaTotal}</div>
            </div>
            <div class="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-xl text-white">
              <div class="text-sm font-medium opacity-90">Total Agendamentos</div>
              <div class="text-2xl font-bold mt-1">${reportData.totalAgendamentos}</div>
            </div>
            <div class="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-xl text-white">
              <div class="text-sm font-medium opacity-90">Ticket Médio</div>
              <div class="text-2xl font-bold mt-1">${reportData.ticketMedio}</div>
            </div>
            <div class="bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-xl text-white">
              <div class="text-sm font-medium opacity-90">Crescimento</div>
              <div class="text-2xl font-bold mt-1">${reportData.crescimento}</div>
            </div>
          </div>

          <!-- Performance por Profissional -->
          <div class="mb-8">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">👥 Performance por Profissional</h2>
            <div class="overflow-x-auto rounded-xl border border-gray-200 shadow-lg">
              <table class="min-w-full divide-y divide-gray-200 bg-white">
                <thead class="bg-gray-50">
                  <tr>
                    <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Profissional
                    </th>
                    <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Receita
                    </th>
                    <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Agendamentos
                    </th>
                    <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      % do Total
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  ${reportData.profissionais.map(p => `
                    <tr class="hover:bg-gray-50 transition-colors duration-200">
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${p.nome}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        ${p.receita}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        ${p.agendamentos}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        ${p.percentual}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Performance por Serviço -->
          <div class="mb-8">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">🛠️ Performance por Serviço</h2>
            <div class="overflow-x-auto rounded-xl border border-gray-200 shadow-lg">
              <table class="min-w-full divide-y divide-gray-200 bg-white">
                <thead class="bg-gray-50">
                  <tr>
                    <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Serviço
                    </th>
                    <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Receita
                    </th>
                    <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Vendas
                    </th>
                    <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      % do Total
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  ${reportData.servicos.map(s => `
                    <tr class="hover:bg-gray-50 transition-colors duration-200">
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${s.nome}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        ${s.receita}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        ${s.vendas}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        ${s.percentual}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Receita Diária -->
          <div class="mb-8">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">📅 Receita Diária</h2>
            <div class="overflow-x-auto rounded-xl border border-gray-200 shadow-lg">
              <table class="min-w-full divide-y divide-gray-200 bg-white">
                <thead class="bg-gray-50">
                  <tr>
                    <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Receita
                    </th>
                    <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Agendamentos
                    </th>
                    <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Ticket Médio
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  ${reportData.dadosDiarios.map(d => `
                    <tr class="hover:bg-gray-50 transition-colors duration-200">
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${d.data}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        ${d.receita}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        ${d.agendamentos} agendamentos
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        ${formatBRL(parseFloat(d.receita.replace(/[^\d,]/g, '').replace(',', '.')) / d.agendamentos)}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Análise de Performance -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 class="text-lg font-semibold text-gray-800 mb-4">📈 Melhor Dia</h3>
              ${(() => {
                const bestDay = revenueData.reduce((max, item) => 
                  item.revenue > max.revenue ? item : max
                );
                return `
                  <div class="text-center">
                    <div class="text-2xl font-bold text-green-600">${formatBRL(bestDay.revenue)}</div>
                    <div class="text-sm text-gray-600">${new Date(bestDay.date).toLocaleDateString('pt-BR')}</div>
                    <div class="text-xs text-gray-500">${bestDay.appointments} agendamentos</div>
                  </div>
                `;
              })()}
            </div>
            <div class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 class="text-lg font-semibold text-gray-800 mb-4">📉 Dia com Menor Receita</h3>
              ${(() => {
                const worstDay = revenueData.reduce((min, item) => 
                  item.revenue < min.revenue ? item : min
                );
                return `
                  <div class="text-center">
                    <div class="text-2xl font-bold text-red-600">${formatBRL(worstDay.revenue)}</div>
                    <div class="text-sm text-gray-600">${new Date(worstDay.date).toLocaleDateString('pt-BR')}</div>
                    <div class="text-xs text-gray-500">${worstDay.appointments} agendamentos</div>
                  </div>
                `;
              })()}
            </div>
          </div>

          <!-- Footer -->
          <div class="text-center text-gray-500 text-sm border-t pt-6">
            <p>Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
            <p class="mt-1">StyleSwift - Transformando a gestão do seu negócio</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Abrir em nova janela para impressão/PDF
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(htmlContent);
      newWindow.document.close();
      
      // Aguardar o carregamento e então abrir dialog de impressão
      setTimeout(() => {
        newWindow.print();
      }, 500);
    }
  };

  // Calcular métricas adicionais
  const avgRevenue = revenueData.length > 0 ? totalRevenue / revenueData.length : 0;
  const totalAppointments = revenueData.reduce((sum, item) => sum + item.appointments, 0);
  const avgAppointments = revenueData.length > 0 ? totalAppointments / revenueData.length : 0;
  const ticketMedio = totalAppointments > 0 ? totalRevenue / totalAppointments : 0;
  const topProfessional = professionalRevenue.length > 0 ? professionalRevenue.sort((a, b) => b.revenue - a.revenue)[0] : null;
  const topService = serviceRevenue.length > 0 ? serviceRevenue.sort((a, b) => b.revenue - a.revenue)[0] : null;

  // Animações
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut" as const
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut" as const
      }
    },
    hover: {
      scale: 1.02,
      transition: {
        duration: 0.2
      }
    }
  };

  const buttonVariants = {
    hover: {
      scale: 1.05,
      transition: {
        duration: 0.2
      }
    },
    tap: {
      scale: 0.95
    }
  };

  // Loading state
  if (permissionsLoading) {
    return <DashboardSkeleton />;
  }

  // Se não tem acesso ao dashboard financeiro, mostrar prompt de upgrade
  if (!canAccessFinancialDashboard) {
    return (
      <UpgradePrompt
        requiredPlan="professional"
        featureName="Dashboard Financeiro"
        currentPlan={planTier || 'essential'}
      />
    );
  }

  return (
    <TooltipProvider>
      <motion.div 
        className="space-y-6 w-full min-h-0 overflow-y-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
      {/* Header com controles */}
      <motion.div 
        className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
        variants={itemVariants}
      >
        <div>
          <motion.h2 
            className="text-2xl font-bold flex items-center gap-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <BarChart className="h-6 w-6" />
            Dashboard Financeiro
          </motion.h2>
          <motion.p 
            className="text-muted-foreground text-sm sm:text-base"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <span className="hidden sm:inline">Acompanhe sua receita e performance em tempo real</span>
            <span className="sm:hidden">Acompanhe receita e performance</span>
            {!canAccessPremiumFeatures && (
              <span className="ml-2 text-xs text-yellow-600">
                <span className="hidden sm:inline">• Alguns recursos disponíveis apenas no plano Premium</span>
                <span className="sm:hidden">• Recursos Premium</span>
              </span>
            )}
          </motion.p>
        </div>
        
        <motion.div 
          className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto"
          variants={itemVariants}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"
              />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Atualizar
          </Button>
          
          

          {canUseAdvancedAnalytics ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateReport}
              className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30 hover:border-yellow-500/50"
            >
              <FileText className="h-4 w-4 mr-2" />
              Gerar Relatório
              <Crown className="h-3 w-3 ml-1 text-yellow-600" />
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div variants={buttonVariants}>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="opacity-50 cursor-not-allowed"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Gerar Relatório
                    <Lock className="h-3 w-3 ml-1" />
                  </Button>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Disponível apenas no plano Premium</p>
                <p className="text-xs text-muted-foreground">Gere relatórios completos em PDF</p>
              </TooltipContent>
            </Tooltip>
          )}
          
          <Select value={period} onValueChange={(value: '7' | '30' | '90') => setPeriod(value)}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Todos os profissionais" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os profissionais</SelectItem>
              {professionals.map(prof => (
                <SelectItem key={prof.id} value={prof.name}>{prof.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>
      </motion.div>

      {/* Cards de métricas principais */}
      <motion.div 
        className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
        variants={itemVariants}
      >
        <motion.div variants={cardVariants} whileHover="hover">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300">Receita Total</CardTitle>
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <DollarSign className="h-4 w-4 text-blue-600" />
              </motion.div>
            </CardHeader>
            <CardContent>
              <motion.div 
                className="text-lg sm:text-2xl font-bold text-blue-900 dark:text-blue-100"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                {formatBRL(totalRevenue)}
              </motion.div>
              {growth !== null && (
                <motion.div 
                  className={`flex items-center text-xs ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                >
                  <motion.div
                    animate={{ y: growth >= 0 ? [0, -2, 0] : [0, 2, 0] }}
                    transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                  >
                    {growth >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  </motion.div>
                  <span className="hidden sm:inline">{growth >= 0 ? '+' : ''}{growth.toFixed(1)}% vs período anterior</span>
                  <span className="sm:hidden">{growth >= 0 ? '+' : ''}{growth.toFixed(1)}%</span>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants} whileHover="hover">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200 dark:border-green-800 hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-300">Agendamentos</CardTitle>
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Calendar className="h-4 w-4 text-green-600" />
              </motion.div>
            </CardHeader>
            <CardContent>
              <motion.div 
                className="text-lg sm:text-2xl font-bold text-green-900 dark:text-green-100"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                {totalAppointments}
              </motion.div>
              <motion.div 
                className="text-xs text-green-600"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                <span className="hidden sm:inline">Média: {avgAppointments.toFixed(1)}/dia</span>
                <span className="sm:hidden">{avgAppointments.toFixed(1)}/dia</span>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants} whileHover="hover">
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-purple-700 dark:text-purple-300">Ticket Médio</CardTitle>
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Target className="h-4 w-4 text-purple-600" />
              </motion.div>
            </CardHeader>
            <CardContent>
              <motion.div 
                className="text-lg sm:text-2xl font-bold text-purple-900 dark:text-purple-100"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                {formatBRL(ticketMedio)}
              </motion.div>
              <motion.div 
                className="text-xs text-purple-600"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
              >
                <span className="hidden sm:inline">Por agendamento</span>
                <span className="sm:hidden">Por agend.</span>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants} whileHover="hover">
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border-orange-200 dark:border-orange-800 hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-orange-700 dark:text-orange-300">Plano Atual</CardTitle>
              <motion.div
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Crown className="h-4 w-4 text-orange-600" />
              </motion.div>
            </CardHeader>
            <CardContent>
              <motion.div 
                className="text-lg sm:text-2xl font-bold text-orange-900 dark:text-orange-100 capitalize"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                {planTier || 'essential'}
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9, duration: 0.5 }}
              >
                <Badge variant="secondary" className="mt-1">
                  {planLimits.has_financial_dashboard ? 'Dashboard Ativo' : 'Dashboard Bloqueado'}
                </Badge>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Gráfico de receita */}
      <motion.div variants={itemVariants}>
        <RevenueChart 
          data={revenueData} 
          totalRevenue={totalRevenue}
          period={period}
        />
      </motion.div>

      {/* Seção de Navegação */}
      <motion.div variants={itemVariants} className="space-y-4">
        {/* Indicador de tab ativa */}
        <motion.div 
          className="flex items-center gap-2 text-sm text-muted-foreground"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="w-2 h-2 bg-primary rounded-full" />
          <span className="capitalize">
            {selectedTab === 'professionals' && 'Profissionais'}
            {selectedTab === 'services' && 'Serviços'}
            {selectedTab === 'heatmap' && 'Horários'}
            {selectedTab === 'comparison' && 'Comparação'}
            {selectedTab === 'insights' && 'Insights'}
          </span>
          {!canAccessPremiumFeatures && (selectedTab === 'heatmap' || selectedTab === 'comparison') && (
            <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
              <Crown className="h-3 w-3 mr-1" />
              Premium
            </Badge>
          )}
        </motion.div>

        {/* Menu de navegação */}
        <Card className="p-4 bg-muted/20 border-border/50">
          <div className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={selectedTab === 'professionals' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedTab('professionals')}
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm h-10 px-3 rounded-lg transition-all duration-200 hover:bg-muted/50"
                >
                  <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Profissionais</span>
                  <span className="sm:hidden">Prof.</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="space-y-2">
                  <p className="font-medium">Performance por Profissional</p>
                  <p className="text-sm text-muted-foreground">Receita e agendamentos por profissional no período</p>
                </div>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={selectedTab === 'services' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedTab('services')}
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm h-10 px-3 rounded-lg transition-all duration-200 hover:bg-muted/50"
                >
                  <Award className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Serviços</span>
                  <span className="sm:hidden">Serv.</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="space-y-2">
                  <p className="font-medium">Receita por Serviço</p>
                  <p className="text-sm text-muted-foreground">Serviços mais vendidos e distribuição de receita</p>
                </div>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={selectedTab === 'heatmap' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedTab('heatmap')}
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm h-10 px-3 rounded-lg transition-all duration-200 hover:bg-muted/50 relative"
                >
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Horários</span>
                  <span className="sm:hidden">Hor.</span>
                  {!canAccessPremiumFeatures && (
                    <Crown className="h-2 w-2 sm:h-3 sm:w-3 text-yellow-600 absolute -top-1 -right-1" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="space-y-2">
                  <p className="font-medium">Heatmap de Horários</p>
                  <p className="text-sm text-muted-foreground">Visualize os horários mais procurados por dia da semana</p>
                  {!canAccessPremiumFeatures && (
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Crown className="h-4 w-4 text-yellow-600" />
                      <p className="text-xs text-yellow-600 font-medium">Recurso Premium</p>
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={selectedTab === 'comparison' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedTab('comparison')}
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm h-10 px-3 rounded-lg transition-all duration-200 hover:bg-muted/50 relative"
                >
                  <BarChart className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Comparação</span>
                  <span className="sm:hidden">Comp.</span>
                  {!canAccessPremiumFeatures && (
                    <Crown className="h-2 w-2 sm:h-3 sm:w-3 text-yellow-600 absolute -top-1 -right-1" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="space-y-2">
                  <p className="font-medium">Comparação de Períodos</p>
                  <p className="text-sm text-muted-foreground">Compare receita, agendamentos e ticket médio entre períodos</p>
                  {!canAccessPremiumFeatures && (
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Crown className="h-4 w-4 text-yellow-600" />
                      <p className="text-xs text-yellow-600 font-medium">Recurso Premium</p>
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={selectedTab === 'insights' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedTab('insights')}
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm h-10 px-3 rounded-lg transition-all duration-200 hover:bg-muted/50"
                >
                  <Star className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Insights</span>
                  <span className="sm:hidden">Ins.</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="space-y-2">
                  <p className="font-medium">Análises e Insights</p>
                  <p className="text-sm text-muted-foreground">Melhores profissionais e serviços do período</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </Card>
      </motion.div>

      {/* Seção de Conteúdo */}
      <motion.div variants={itemVariants} className="space-y-4">
        {selectedTab === 'professionals' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Performance por Profissional
                </CardTitle>
                <CardDescription>
                  Receita e agendamentos por profissional no período
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {professionalRevenue
                    .sort((a, b) => b.revenue - a.revenue)
                    .map((item, index) => (
                      <motion.div 
                        key={index} 
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-3"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.3 }}
                        whileHover={{ scale: 1.02, x: 5 }}
                      >
                        <div className="flex items-center gap-3">
                          <motion.div 
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                              index === 0 ? 'bg-yellow-500' : 
                              index === 1 ? 'bg-gray-400' : 
                              index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                            }`}
                            whileHover={{ scale: 1.1, rotate: 5 }}
                          >
                            {index + 1}
                          </motion.div>
                          <div>
                            <div className="font-medium">{item.professional_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {item.appointments} agendamentos
                            </div>
                          </div>
                        </div>
                        <div className="text-right sm:text-right">
                          <div className="font-bold text-lg">{formatBRL(item.revenue)}</div>
                          <div className="text-sm text-muted-foreground">
                            {totalRevenue > 0 ? ((item.revenue / totalRevenue) * 100).toFixed(1) : '0'}% do total
                          </div>
                        </div>
                      </motion.div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {selectedTab === 'services' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Lista de serviços */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Receita por Serviço
                  </CardTitle>
                  <CardDescription>
                    Serviços mais vendidos e sua contribuição para a receita
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {serviceRevenue
                      .sort((a, b) => b.revenue - a.revenue)
                      .map((item, index) => (
                        <motion.div 
                          key={index} 
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-3"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1, duration: 0.3 }}
                          whileHover={{ scale: 1.02, x: 5 }}
                        >
                          <div className="flex items-center gap-3">
                            <motion.div 
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                                index === 0 ? 'bg-green-500' : 
                                index === 1 ? 'bg-blue-500' : 
                                index === 2 ? 'bg-purple-500' : 'bg-gray-500'
                              }`}
                              whileHover={{ scale: 1.1, rotate: 5 }}
                            >
                              {index + 1}
                            </motion.div>
                            <div>
                              <div className="font-medium">{item.service_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {item.count} vendas
                              </div>
                            </div>
                          </div>
                          <div className="text-right sm:text-right">
                            <div className="font-bold text-lg">{formatBRL(item.revenue)}</div>
                            <div className="text-sm text-muted-foreground">
                              {totalRevenue > 0 ? ((item.revenue / totalRevenue) * 100).toFixed(1) : '0'}% do total
                            </div>
                          </div>
                        </motion.div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* Gráfico de pizza */}
              <PieChart
                data={pieData}
                title="Distribuição de Receita"
                description="Percentual de receita por serviço"
              />
            </div>
          </motion.div>
        )}

        {selectedTab === 'heatmap' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {canAccessPremiumFeatures ? (
              <HeatmapChart
                data={heatmapData}
                totalRevenue={totalRevenue}
              />
            ) : (
              <UpgradePrompt
                requiredPlan="premium"
                featureName="Heatmap de Horários"
                currentPlan={planTier || 'essential'}
              />
            )}
          </motion.div>
        )}

        {selectedTab === 'comparison' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {canAccessPremiumFeatures ? (
              <ComparisonChart
                data={comparisonData}
                title="Comparação de Períodos"
                description={`Comparação entre os últimos ${period} dias e o período anterior`}
              />
            ) : (
              <UpgradePrompt
                requiredPlan="premium"
                featureName="Comparação de Períodos"
                currentPlan={planTier || 'essential'}
              />
            )}
          </motion.div>
        )}

        {selectedTab === 'insights' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Melhor Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {topProfessional && (
                      <motion.div 
                        className="space-y-3"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                      >
                        <div className="flex items-center gap-2">
                          <motion.div
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                          >
                            <Award className="h-5 w-5 text-yellow-500" />
                          </motion.div>
                          <span className="font-medium">Profissional Top</span>
                        </div>
                        <div className="text-lg font-bold">{topProfessional.professional_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatBRL(topProfessional.revenue)} • {topProfessional.appointments} agendamentos
                          {totalRevenue > 0 && (
                            <span className="text-blue-600 ml-1">
                              ({((topProfessional.revenue / totalRevenue) * 100).toFixed(1)}%)
                            </span>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5" />
                      Serviço Mais Vendido
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {topService && (
                      <motion.div 
                        className="space-y-3"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                      >
                        <div className="flex items-center gap-2">
                          <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                          >
                            <Award className="h-5 w-5 text-green-500" />
                          </motion.div>
                          <span className="font-medium">Serviço Top</span>
                        </div>
                        <div className="text-lg font-bold">{topService.service_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatBRL(topService.revenue)} • {topService.count} vendas
                          {totalRevenue > 0 && (
                            <span className="text-green-600 ml-1">
                              ({((topService.revenue / totalRevenue) * 100).toFixed(1)}%)
                            </span>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </motion.div>
        )}
      </motion.div>
      </motion.div>
    </TooltipProvider>
  );
}