import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  Cpu,
  HardDrive,
  Wifi,
  Server,
  Bell,
  BellOff,
  Settings,
  RefreshCw,
  BarChart,
  Zap,
  Database,
  Globe,
  Users,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SystemMetric {
  id: string;
  type: 'cpu' | 'memory' | 'disk' | 'network' | 'database' | 'api';
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  timestamp: string;
  description: string;
}

interface SystemAlert {
  id: string;
  type: 'performance' | 'error' | 'security' | 'availability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: string;
  resolved: boolean;
  acknowledged: boolean;
}

interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  database: number;
  uptime: number;
  activeUsers: number;
  responseTime: number;
}

export const SystemMonitor = ({ tenantId }: { tenantId: string }) => {
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [health, setHealth] = useState<SystemHealth>({
    overall: 'healthy',
    cpu: 0,
    memory: 0,
    disk: 0,
    network: 0,
    database: 0,
    uptime: 0,
    activeUsers: 0,
    responseTime: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // segundos
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    loadSystemMetrics();
    loadSystemAlerts();
    loadSystemHealth();

    if (autoRefresh) {
      const interval = setInterval(() => {
        loadSystemMetrics();
        loadSystemAlerts();
        loadSystemHealth();
      }, refreshInterval * 1000);

      return () => clearInterval(interval);
    }
  }, [tenantId, autoRefresh, refreshInterval]);

  const loadSystemMetrics = async () => {
    try {
      // Mock data - será substituído quando as tabelas forem criadas
      const mockMetrics: SystemMetric[] = [
        {
          id: '1',
          type: 'cpu',
          value: health.cpu,
          unit: '%',
          status: health.cpu > 80 ? 'critical' : health.cpu > 60 ? 'warning' : 'normal',
          timestamp: new Date().toISOString(),
          description: 'Uso de CPU'
        },
        {
          id: '2',
          type: 'memory',
          value: health.memory,
          unit: '%',
          status: health.memory > 85 ? 'critical' : health.memory > 70 ? 'warning' : 'normal',
          timestamp: new Date().toISOString(),
          description: 'Uso de memória'
        },
        {
          id: '3',
          type: 'disk',
          value: health.disk,
          unit: '%',
          status: health.disk > 90 ? 'critical' : health.disk > 80 ? 'warning' : 'normal',
          timestamp: new Date().toISOString(),
          description: 'Uso de disco'
        }
      ];

      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
    }
  };

  const loadSystemAlerts = async () => {
    try {
      // Mock data - será substituído quando as tabelas forem criadas
      const mockAlerts: SystemAlert[] = [
        {
          id: '1',
          type: 'performance',
          severity: 'low',
          title: 'Alto uso de CPU',
          description: 'CPU atingiu 75% de uso',
          timestamp: new Date().toISOString(),
          resolved: false,
          acknowledged: false
        },
        {
          id: '2',
          type: 'security',
          severity: 'medium',
          title: 'Tentativa de login suspeita',
          description: 'Múltiplas tentativas de login detectadas',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          resolved: true,
          acknowledged: true
        }
      ];

      setAlerts(mockAlerts);
    } catch (error) {
      console.error('Erro ao carregar alertas:', error);
    }
  };

  const loadSystemHealth = async () => {
    try {
      // Mock data - será substituído quando as tabelas forem criadas
      const mockHealth: SystemHealth = {
        overall: 'healthy',
        cpu: Math.floor(Math.random() * 30) + 20, // 20-50%
        memory: Math.floor(Math.random() * 40) + 30, // 30-70%
        disk: Math.floor(Math.random() * 20) + 40, // 40-60%
        network: Math.floor(Math.random() * 25) + 15, // 15-40%
        database: Math.floor(Math.random() * 15) + 10, // 10-25%
        uptime: Math.floor(Math.random() * 86400) + 3600, // 1h-24h
        activeUsers: Math.floor(Math.random() * 50) + 5, // 5-55
        responseTime: Math.floor(Math.random() * 100) + 50 // 50-150ms
      };

      setHealth(mockHealth);
    } catch (error) {
      console.error('Erro ao carregar saúde do sistema:', error);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      // Mock - será implementado quando as tabelas forem criadas
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      ));

      toast({
        title: "Alerta reconhecido com sucesso!",
        description: "O alerta foi marcado como reconhecido no sistema de monitoramento.",
      });

    } catch (error) {
      console.error('Erro ao reconhecer alerta:', error);
      toast({
        title: "Erro ao reconhecer alerta",
        description: "Não foi possível marcar o alerta como reconhecido. Por favor, tente novamente.",
        variant: "destructive"
      });
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      // Mock - será implementado quando as tabelas forem criadas
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, resolved: true } : alert
      ));

      toast({
        title: "Alerta resolvido com sucesso!",
        description: "O alerta foi marcado como resolvido no sistema de monitoramento.",
      });

    } catch (error) {
      console.error('Erro ao resolver alerta:', error);
      toast({
        title: "Erro ao resolver alerta",
        description: "Não foi possível marcar o alerta como resolvido. Por favor, tente novamente.",
        variant: "destructive"
      });
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <XCircle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const filteredAlerts = showResolved 
    ? alerts 
    : alerts.filter(alert => !alert.resolved);

  return (
    <div className="space-y-6">
      {/* Status Geral do Sistema */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Status do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className={`text-4xl font-bold ${getHealthColor(health.overall)}`}>
                {getHealthIcon(health.overall)}
              </div>
              <p className="text-sm font-medium capitalize">{health.overall}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Uptime: {formatUptime(health.uptime)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-green-500" />
                <span className="text-sm">Usuários ativos: {health.activeUsers}</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-purple-500" />
                <span className="text-sm">Tempo resposta: {health.responseTime}ms</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas do Sistema */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Cpu className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">CPU</span>
              </div>
              <span className="text-sm font-bold">{health.cpu}%</span>
            </div>
            <Progress value={health.cpu} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0%</span>
              <span>100%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Memória</span>
              </div>
              <span className="text-sm font-bold">{health.memory}%</span>
            </div>
            <Progress value={health.memory} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0%</span>
              <span>100%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <HardDrive className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Disco</span>
              </div>
              <span className="text-sm font-bold">{health.disk}%</span>
            </div>
            <Progress value={health.disk} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0%</span>
              <span>100%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Wifi className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Rede</span>
              </div>
              <span className="text-sm font-bold">{health.network}%</span>
            </div>
            <Progress value={health.network} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0%</span>
              <span>100%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4 text-indigo-500" />
                <span className="text-sm font-medium">Database</span>
              </div>
              <span className="text-sm font-bold">{health.database}%</span>
            </div>
            <Progress value={health.database} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0%</span>
              <span>100%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">Alertas</span>
              </div>
              <span className="text-sm font-bold">{alerts.filter(a => !a.resolved).length}</span>
            </div>
            <div className="h-2 bg-muted rounded-full">
              <div 
                className="h-2 bg-red-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((alerts.filter(a => !a.resolved).length / 10) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0</span>
              <span>10+</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configurações de Monitoramento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações de Monitoramento
          </CardTitle>
          <CardDescription>
            Configure o monitoramento automático do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Atualização Automática</Label>
              <p className="text-sm text-muted-foreground">
                Atualiza métricas automaticamente
              </p>
            </div>
            <Switch
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
          </div>

          {autoRefresh && (
            <div className="space-y-2">
              <Label>Intervalo de Atualização (segundos)</Label>
              <Input
                type="number"
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(parseInt(e.target.value) || 30)}
                min={5}
                max={300}
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Mostrar Alertas Resolvidos</Label>
              <p className="text-sm text-muted-foreground">
                Exibe alertas já resolvidos
              </p>
            </div>
            <Switch
              checked={showResolved}
              onCheckedChange={setShowResolved}
            />
          </div>

          <Button 
            onClick={() => {
              loadSystemMetrics();
              loadSystemAlerts();
              loadSystemHealth();
            }}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Atualizar Agora
          </Button>
        </CardContent>
      </Card>

      {/* Alertas do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alertas do Sistema
          </CardTitle>
          <CardDescription>
            Monitoramento em tempo real de problemas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum alerta ativo</p>
              <p className="text-sm">O sistema está funcionando normalmente</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAlerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    alert.resolved ? 'bg-muted/50' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${getSeverityColor(alert.severity)}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{alert.title}</h4>
                        <Badge 
                          variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {alert.severity.toUpperCase()}
                        </Badge>
                        {alert.acknowledged && (
                          <Badge variant="outline" className="text-xs">
                            Reconhecido
                          </Badge>
                        )}
                        {alert.resolved && (
                          <Badge variant="outline" className="text-xs">
                            Resolvido
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {alert.description} • {new Date(alert.timestamp).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!alert.resolved && (
                      <>
                        {!alert.acknowledged && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => acknowledgeAlert(alert.id)}
                            className="flex items-center gap-1"
                          >
                            <Bell className="h-3 w-3" />
                            Reconhecer
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resolveAlert(alert.id)}
                          className="flex items-center gap-1"
                        >
                          <CheckCircle className="h-3 w-3" />
                          Resolver
                        </Button>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Logs do Sistema
          </CardTitle>
          <CardDescription>
            Logs estruturados das últimas atividades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {metrics.slice(0, 20).map((metric) => (
              <div
                key={metric.id}
                className="flex items-center justify-between p-2 text-sm border rounded"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    metric.status === 'critical' ? 'bg-red-500' :
                    metric.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  <span className="font-mono">{metric.type}</span>
                  <span>{metric.value}{metric.unit}</span>
                </div>
                <span className="text-muted-foreground text-xs">
                  {new Date(metric.timestamp).toLocaleTimeString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
