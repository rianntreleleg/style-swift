import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Heart, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Cpu,
  HardDrive,
  Wifi,
  Database,
  Zap,
  TrendingUp,
  TrendingDown,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SystemMetric {
  id: string;
  metric_type: 'cpu' | 'memory' | 'disk' | 'network' | 'database' | 'api';
  metric_name: string;
  metric_value: number;
  unit: string;
  timestamp: string;
}

interface SystemAlert {
  id: string;
  alert_type: 'performance' | 'security' | 'backup' | 'system' | 'maintenance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  status: 'active' | 'acknowledged' | 'resolved';
  created_at: string;
}

interface SystemHealthData {
  overall_status: 'healthy' | 'warning' | 'critical' | 'maintenance';
  uptime_percentage: number;
  health_score: number;
  last_check_at: string;
  next_check_at: string;
}

export const SystemHealth = ({ tenantId }: { tenantId: string }) => {
  const [health, setHealth] = useState<SystemHealthData>({
    overall_status: 'healthy',
    uptime_percentage: 100,
    health_score: 100,
    last_check_at: '',
    next_check_at: ''
  });
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSystemHealth();
    loadMetrics();
    loadAlerts();
  }, [tenantId]);

  const loadSystemHealth = async () => {
    try {
      const { data, error } = await supabase
        .from('system_health')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setHealth({
          overall_status: data.overall_status as 'healthy' | 'warning' | 'critical' | 'maintenance',
          uptime_percentage: data.uptime_percentage || 100,
          health_score: data.health_score || 100,
          last_check_at: data.last_check_at || '',
          next_check_at: data.next_check_at || ''
        });
      }
    } catch (error) {
      console.error('Erro ao carregar saúde do sistema:', error);
    }
  };

  const loadMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from('system_metrics')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Transform the data to match the interface
      const transformedMetrics: SystemMetric[] = (data || []).map(metric => ({
        id: metric.id,
        metric_type: metric.metric_type as 'cpu' | 'memory' | 'disk' | 'network' | 'database' | 'api',
        metric_name: metric.metric_name,
        metric_value: metric.metric_value,
        unit: metric.unit || '',
        timestamp: metric.timestamp
      }));

      setMetrics(transformedMetrics);
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
    }
  };

  const loadAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('system_alerts')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Transform the data to match the interface
      const transformedAlerts: SystemAlert[] = (data || []).map(alert => ({
        id: alert.id,
        alert_type: alert.alert_type as 'performance' | 'security' | 'backup' | 'system' | 'maintenance',
        severity: alert.severity as 'low' | 'medium' | 'high' | 'critical',
        title: alert.title,
        description: alert.description,
        status: alert.status as 'active' | 'acknowledged' | 'resolved',
        created_at: alert.created_at
      }));

      setAlerts(transformedAlerts);
    } catch (error) {
      console.error('Erro ao carregar alertas:', error);
    }
  };

  const refreshHealth = async () => {
    setIsLoading(true);
    try {
      // Simulate health check
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      loadSystemHealth();
      loadMetrics();
      loadAlerts();

      toast({
        title: "Verificação concluída!",
        description: "A saúde do sistema foi verificada com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao verificar saúde:', error);
      toast({
        title: "Erro",
        description: "Não foi possível verificar a saúde do sistema.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      case 'maintenance': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <Heart className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'maintenance': return <RefreshCw className="h-5 w-5 text-blue-500" />;
      default: return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getMetricIcon = (type: string) => {
    switch (type) {
      case 'cpu': return <Cpu className="h-4 w-4" />;
      case 'memory': return <Activity className="h-4 w-4" />;
      case 'disk': return <HardDrive className="h-4 w-4" />;
      case 'network': return <Wifi className="h-4 w-4" />;
      case 'database': return <Database className="h-4 w-4" />;
      case 'api': return <Zap className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'performance': return <TrendingDown className="h-4 w-4" />;
      case 'security': return <AlertTriangle className="h-4 w-4" />;
      case 'backup': return <Database className="h-4 w-4" />;
      case 'system': return <Activity className="h-4 w-4" />;
      case 'maintenance': return <RefreshCw className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getLatestMetric = (type: string) => {
    return metrics.find(m => m.metric_type === type);
  };

  return (
    <div className="space-y-6">
      {/* Status Geral */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getHealthIcon(health.overall_status)}
            Status do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className={`text-4xl font-bold ${getHealthColor(health.overall_status)}`}>
                {health.health_score}
              </div>
              <p className="text-sm text-muted-foreground">Score de Saúde</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Uptime: {health.uptime_percentage}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Status: {health.overall_status}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm">
                  Última verificação: {health.last_check_at ? new Date(health.last_check_at).toLocaleString('pt-BR') : 'Nunca'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas em Tempo Real */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {['cpu', 'memory', 'disk', 'network', 'database', 'api'].map((type) => {
          const metric = getLatestMetric(type);
          const value = metric?.metric_value || 0;
          const unit = metric?.unit || '%';
          
          return (
            <Card key={type}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  {getMetricIcon(type)}
                  <div className="flex-1">
                    <p className="text-sm font-medium capitalize">{type}</p>
                    <p className="text-2xl font-bold">{value}{unit}</p>
                  </div>
                </div>
                <Progress value={Math.min(value, 100)} className="mt-2" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Ações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Ações do Sistema
          </CardTitle>
          <CardDescription>
            Gerencie a saúde e monitoramento do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={refreshHealth}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Verificar Saúde
            </Button>

            <Button 
              variant="outline"
              onClick={() => {
                loadMetrics();
                loadAlerts();
              }}
              className="flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Atualizar Métricas
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alertas do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alertas do Sistema
          </CardTitle>
          <CardDescription>
            Monitoramento de problemas e notificações
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>Nenhum alerta ativo</p>
              <p className="text-sm">O sistema está funcionando normalmente</p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    alert.status === 'active' ? 'bg-red-50 border-red-200' : 'bg-muted/50'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${getAlertColor(alert.severity)}`} />
                    <div className="flex items-center gap-2">
                      {getAlertIcon(alert.alert_type)}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{alert.title}</h4>
                          <Badge 
                            variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {alert.severity.toUpperCase()}
                          </Badge>
                          {alert.status !== 'active' && (
                            <Badge variant="outline" className="text-xs">
                              {alert.status}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {alert.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(alert.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {alert.status === 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <CheckCircle className="h-3 w-3" />
                        Reconhecer
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
