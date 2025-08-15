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
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Activity,
  Globe,
  Wifi,
  WifiOff,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Settings,
  RefreshCw,
  BarChart,
  Zap,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SecurityEvent {
  id: string;
  type: 'ddos' | 'brute_force' | 'suspicious_activity' | 'rate_limit' | 'blocked_ip';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  ip_address: string;
  user_agent: string;
  timestamp: string;
  resolved: boolean;
}

interface SecurityStats {
  totalEvents: number;
  blockedIPs: number;
  rateLimitHits: number;
  ddosAttempts: number;
  suspiciousActivities: number;
  last24Hours: number;
  securityScore: number;
}

interface RateLimitConfig {
  enabled: boolean;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  blockDuration: number; // em minutos
}

export const SecurityMonitor = ({ tenantId }: { tenantId: string }) => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [stats, setStats] = useState<SecurityStats>({
    totalEvents: 0,
    blockedIPs: 0,
    rateLimitHits: 0,
    ddosAttempts: 0,
    suspiciousActivities: 0,
    last24Hours: 0,
    securityScore: 100
  });
  const [rateLimitConfig, setRateLimitConfig] = useState<RateLimitConfig>({
    enabled: true,
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    requestsPerDay: 10000,
    blockDuration: 15
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [ddosProtection, setDdosProtection] = useState(true);
  const [bruteForceProtection, setBruteForceProtection] = useState(true);
  const [geoBlocking, setGeoBlocking] = useState(false);

  useEffect(() => {
    loadSecurityEvents();
    loadSecurityStats();
    loadSecurityConfig();
  }, [tenantId]);

  const loadSecurityEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Transform the data to match the SecurityEvent interface
      const transformedEvents: SecurityEvent[] = (data || []).map(event => ({
        id: event.id,
        type: event.type as 'ddos' | 'brute_force' | 'suspicious_activity' | 'rate_limit' | 'blocked_ip',
        severity: event.severity as 'low' | 'medium' | 'high' | 'critical',
        description: event.description,
        ip_address: event.ip_address as string,
        user_agent: event.user_agent || '',
        timestamp: event.timestamp || new Date().toISOString(),
        resolved: event.resolved || false
      }));

      setEvents(transformedEvents);
    } catch (error) {
      console.error('Erro ao carregar eventos de segurança:', error);
    }
  };

  const loadSecurityStats = async () => {
    try {
      const { data, error } = await supabase
        .from('security_stats')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setStats({
          totalEvents: data.total_events || 0,
          blockedIPs: data.blocked_ips || 0,
          rateLimitHits: data.rate_limit_hits || 0,
          ddosAttempts: data.ddos_attempts || 0,
          suspiciousActivities: data.suspicious_activities || 0,
          last24Hours: data.last_24_hours || 0,
          securityScore: data.security_score || 100
        });
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas de segurança:', error);
    }
  };

  const loadSecurityConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('security_config')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setRateLimitConfig({
          enabled: data.rate_limit_enabled || true,
          requestsPerMinute: data.requests_per_minute || 60,
          requestsPerHour: data.requests_per_hour || 1000,
          requestsPerDay: data.requests_per_day || 10000,
          blockDuration: data.block_duration || 15
        });
        setDdosProtection(data.ddos_protection || true);
        setBruteForceProtection(data.brute_force_protection || true);
        setGeoBlocking(data.geo_blocking || false);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações de segurança:', error);
    }
  };

  const updateSecurityConfig = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('security_config')
        .upsert({
          tenant_id: tenantId,
          rate_limit_enabled: rateLimitConfig.enabled,
          requests_per_minute: rateLimitConfig.requestsPerMinute,
          requests_per_hour: rateLimitConfig.requestsPerHour,
          requests_per_day: rateLimitConfig.requestsPerDay,
          block_duration: rateLimitConfig.blockDuration,
          ddos_protection: ddosProtection,
          brute_force_protection: bruteForceProtection,
          geo_blocking: geoBlocking
        });

      if (error) throw error;

      toast({
        title: "Configurações salvas!",
        description: "As configurações de segurança foram atualizadas.",
      });

    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resolveEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('security_events')
        .update({ resolved: true })
        .eq('id', eventId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      toast({
        title: "Evento resolvido!",
        description: "O evento de segurança foi marcado como resolvido.",
      });

      loadSecurityEvents();
      loadSecurityStats();

    } catch (error) {
      console.error('Erro ao resolver evento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível resolver o evento.",
        variant: "destructive"
      });
    }
  };

  const blockIP = async (ipAddress: string) => {
    try {
      const { error } = await supabase.functions.invoke('block-ip', {
        body: { tenantId, ipAddress, duration: rateLimitConfig.blockDuration }
      });

      if (error) throw error;

      toast({
        title: "IP bloqueado!",
        description: `O IP ${ipAddress} foi bloqueado por ${rateLimitConfig.blockDuration} minutos.`,
      });

      loadSecurityEvents();

    } catch (error) {
      console.error('Erro ao bloquear IP:', error);
      toast({
        title: "Erro",
        description: "Não foi possível bloquear o IP.",
        variant: "destructive"
      });
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

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'ddos': return <Zap className="h-4 w-4" />;
      case 'brute_force': return <Lock className="h-4 w-4" />;
      case 'suspicious_activity': return <Eye className="h-4 w-4" />;
      case 'rate_limit': return <Clock className="h-4 w-4" />;
      case 'blocked_ip': return <WifiOff className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSecurityScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Score de Segurança */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Score de Segurança
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className={`text-4xl font-bold ${getSecurityScoreColor(stats.securityScore)}`}>
                {stats.securityScore}
              </div>
              <p className="text-sm text-muted-foreground">Pontos</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Proteção DDoS: Ativa</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Rate Limiting: Ativo</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Monitoramento: Ativo</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm font-medium">Total de Eventos</p>
                <p className="text-2xl font-bold">{stats.totalEvents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <WifiOff className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm font-medium">IPs Bloqueados</p>
                <p className="text-2xl font-bold">{stats.blockedIPs}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm font-medium">Tentativas DDoS</p>
                <p className="text-2xl font-bold">{stats.ddosAttempts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Últimas 24h</p>
                <p className="text-2xl font-bold">{stats.last24Hours}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configurações de Segurança */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações de Segurança
          </CardTitle>
          <CardDescription>
            Configure as proteções de segurança do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Rate Limiting */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Rate Limiting</Label>
                <p className="text-sm text-muted-foreground">
                  Limita o número de requisições por IP
                </p>
              </div>
              <Switch
                checked={rateLimitConfig.enabled}
                onCheckedChange={(checked) => 
                  setRateLimitConfig(prev => ({ ...prev, enabled: checked }))
                }
              />
            </div>

            {rateLimitConfig.enabled && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-4">
                <div className="space-y-2">
                  <Label>Por Minuto</Label>
                  <Input
                    type="number"
                    value={rateLimitConfig.requestsPerMinute}
                    onChange={(e) => 
                      setRateLimitConfig(prev => ({ 
                        ...prev, 
                        requestsPerMinute: parseInt(e.target.value) || 60 
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Por Hora</Label>
                  <Input
                    type="number"
                    value={rateLimitConfig.requestsPerHour}
                    onChange={(e) => 
                      setRateLimitConfig(prev => ({ 
                        ...prev, 
                        requestsPerHour: parseInt(e.target.value) || 1000 
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Por Dia</Label>
                  <Input
                    type="number"
                    value={rateLimitConfig.requestsPerDay}
                    onChange={(e) => 
                      setRateLimitConfig(prev => ({ 
                        ...prev, 
                        requestsPerDay: parseInt(e.target.value) || 10000 
                      }))
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Proteções */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Proteção DDoS</Label>
                <p className="text-sm text-muted-foreground">
                  Detecta e bloqueia ataques DDoS
                </p>
              </div>
              <Switch
                checked={ddosProtection}
                onCheckedChange={setDdosProtection}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Proteção Brute Force</Label>
                <p className="text-sm text-muted-foreground">
                  Bloqueia tentativas de força bruta
                </p>
              </div>
              <Switch
                checked={bruteForceProtection}
                onCheckedChange={setBruteForceProtection}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Bloqueio Geográfico</Label>
                <p className="text-sm text-muted-foreground">
                  Bloqueia acessos de regiões específicas
                </p>
              </div>
              <Switch
                checked={geoBlocking}
                onCheckedChange={setGeoBlocking}
              />
            </div>
          </div>

          <Button 
            onClick={updateSecurityConfig}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Shield className="h-4 w-4 mr-2" />
            )}
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>

      {/* Eventos de Segurança */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Eventos de Segurança
          </CardTitle>
          <CardDescription>
            Monitoramento em tempo real de ameaças
          </CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum evento de segurança detectado</p>
              <p className="text-sm">O sistema está protegido e monitorado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    event.resolved ? 'bg-muted/50' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${getSeverityColor(event.severity)}`} />
                    <div className="flex items-center gap-2">
                      {getEventIcon(event.type)}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{event.description}</h4>
                          <Badge 
                            variant={event.severity === 'critical' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {event.severity.toUpperCase()}
                          </Badge>
                          {event.resolved && (
                            <Badge variant="outline" className="text-xs">
                              Resolvido
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          IP: {event.ip_address} • {new Date(event.timestamp).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!event.resolved && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => blockIP(event.ip_address)}
                          className="flex items-center gap-1"
                        >
                          <WifiOff className="h-3 w-3" />
                          Bloquear IP
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resolveEvent(event.id)}
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
    </div>
  );
};
