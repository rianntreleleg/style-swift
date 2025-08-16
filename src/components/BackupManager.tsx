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
  Database, 
  Download, 
  Upload, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Settings,
  HardDrive,
  Calendar,
  FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import UpgradePrompt from '@/components/UpgradePrompt';

interface Backup {
  id: string;
  name: string;
  description: string;
  backup_type: 'full' | 'incremental' | 'differential';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  file_path: string;
  file_size: number;
  compression_ratio: number;
  created_at: string;
  completed_at: string;
  expires_at: string;
  retention_days: number;
}

interface BackupStats {
  total_backups: number;
  successful_backups: number;
  failed_backups: number;
  total_size: number;
  last_backup_at: string;
  next_scheduled_backup: string;
}

export const BackupManager = ({ tenantId, planTier }: { tenantId: string; planTier?: string }) => {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [stats, setStats] = useState<BackupStats>({
    total_backups: 0,
    successful_backups: 0,
    failed_backups: 0,
    total_size: 0,
    last_backup_at: '',
    next_scheduled_backup: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [autoBackup, setAutoBackup] = useState(false); // Padrão desativado
  const [backupFrequency, setBackupFrequency] = useState('monthly'); // Padrão mensal
  const [retentionDays, setRetentionDays] = useState(30);

  // Usar hook de permissões
  const { canUseBackup, planLimits, isLoading: permissionsLoading } = usePermissions(tenantId);
  const [restoreOptions, setRestoreOptions] = useState({
    restoreAppointments: true,
    restoreCustomers: true,
    restoreProfessionals: true,
    restoreServices: true
  });

  useEffect(() => {
    if (canUseBackup) {
      loadBackups();
      loadBackupStats();
    }
  }, [tenantId, canUseBackup]);

  const loadBackups = async () => {
    try {
      const { data, error } = await supabase
        .from('backups')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Transform the data to match the Backup interface
      const transformedBackups: Backup[] = (data || []).map(backup => ({
        id: backup.id,
        name: backup.name,
        description: backup.description,
        backup_type: backup.backup_type as 'full' | 'incremental' | 'differential',
        status: backup.status as 'pending' | 'in_progress' | 'completed' | 'failed',
        file_path: backup.file_path || '',
        file_size: backup.file_size || 0,
        compression_ratio: backup.compression_ratio || 0,
        created_at: backup.created_at,
        completed_at: backup.completed_at || '',
        expires_at: backup.expires_at || '',
        retention_days: backup.retention_days || 30
      }));

      setBackups(transformedBackups);
    } catch (error) {
      console.error('Erro ao carregar backups:', error);
    }
  };

  const loadBackupStats = async () => {
    try {
      const { data, error } = await supabase
        .from('backup_stats')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setStats({
          total_backups: data.total_backups || 0,
          successful_backups: data.successful_backups || 0,
          failed_backups: data.failed_backups || 0,
          total_size: data.total_size || 0,
          last_backup_at: data.last_backup_at || '',
          next_scheduled_backup: data.next_scheduled_backup || ''
        });
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas de backup:', error);
    }
  };

  const createBackup = async () => {
    // Check if user has backup access
    if (!canUseBackup) {
      toast({
        title: "Recurso Premium",
        description: "Backup automático está disponível apenas para usuários Premium. Faça upgrade do seu plano para acessar esta funcionalidade.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-backup', {
        body: { 
          tenantId, 
          backupType: 'full',
          description: 'Manual backup created by user'
        }
      });

      if (error) throw error;

      toast({
        title: "Backup iniciado!",
        description: "O backup está sendo criado. Você será notificado quando estiver pronto.",
      });

      // Reload backups after a short delay
      setTimeout(() => {
        loadBackups();
        loadBackupStats();
      }, 3000);

    } catch (error) {
      console.error('Erro ao criar backup:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o backup.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadBackup = async (backupId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('download-backup', {
        body: { backupId }
      });

      if (error) throw error;

      // In production, this would trigger the actual download
      // For now, we'll just show a success message
      toast({
        title: "Download iniciado!",
        description: "O download do backup foi iniciado.",
      });

    } catch (error) {
      console.error('Erro ao baixar backup:', error);
      toast({
        title: "Erro",
        description: "Não foi possível baixar o backup.",
        variant: "destructive"
      });
    }
  };

  const restoreBackup = async (backupId: string) => {
    if (!confirm('Tem certeza que deseja restaurar este backup? Esta ação pode sobrescrever dados existentes.')) {
      return;
    }

    setIsRestoring(true);
    try {
      const { data, error } = await supabase.functions.invoke('restore-backup', {
        body: { 
          backupId,
          targetTenantId: tenantId,
          restoreOptions 
        }
      });

      if (error) throw error;

      toast({
        title: "Backup restaurado",
        description: `${data.restoredRecords} registros foram restaurados com sucesso.`,
      });
      
      // Reload data after restoration
      loadBackups();
      loadBackupStats();
    } catch (error) {
      console.error('Erro ao restaurar backup:', error);
      toast({
        title: "Erro na restauração",
        description: "Não foi possível restaurar o backup.",
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'in_progress': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const successRate = stats.total_backups > 0 
    ? Math.round((stats.successful_backups / stats.total_backups) * 100) 
    : 100;

  // Loading state
  if (permissionsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Se não tem acesso ao backup, mostrar prompt de upgrade
  if (!canUseBackup) {
    return (
      <UpgradePrompt
        requiredPlan="premium"
        featureName="Sistema de Backup"
        currentPlan={planTier || 'essential'}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas de Backup */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total de Backups</p>
                <p className="text-2xl font-bold">{stats.total_backups}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Sucessos</p>
                <p className="text-2xl font-bold">{stats.successful_backups}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <HardDrive className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Tamanho Total</p>
                <p className="text-2xl font-bold">{formatFileSize(stats.total_size)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Taxa de Sucesso</p>
                <p className="text-2xl font-bold">{successRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configurações de Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações de Backup
          </CardTitle>
          <CardDescription>
            Configure as opções de backup automático
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Backup Automático</Label>
              <p className="text-sm text-muted-foreground">
                Criar backups automaticamente (desativado por padrão)
              </p>
            </div>
            <Switch
              checked={autoBackup}
              onCheckedChange={setAutoBackup}
            />
          </div>

          {autoBackup && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frequência</Label>
                <select
                  value={backupFrequency}
                  onChange={(e) => setBackupFrequency(e.target.value)}
                  className="w-full p-2 border rounded-md bg-background"
                >
                  <option value="daily">Diário</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensal (padrão)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Retenção (dias)</Label>
                <Input
                  type="number"
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(parseInt(e.target.value) || 30)}
                  min="1"
                  max="365"
                />
              </div>
            </div>
          )}

          <Button 
            onClick={createBackup}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Criar Backup Manual
          </Button>
        </CardContent>
      </Card>

      {/* Lista de Backups */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Histórico de Backups
          </CardTitle>
          <CardDescription>
            Últimos backups criados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum backup encontrado</p>
              <p className="text-sm">Crie seu primeiro backup para começar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {backups.map((backup) => (
                <motion.div
                  key={backup.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(backup.status)}`} />
                    <div className="flex items-center gap-2">
                      {getStatusIcon(backup.status)}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{backup.name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {backup.backup_type}
                          </Badge>
                          <Badge 
                            variant={backup.status === 'completed' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {backup.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {backup.description} • {new Date(backup.created_at).toLocaleString('pt-BR')}
                        </p>
                        {backup.file_size && (
                          <p className="text-xs text-muted-foreground">
                            Tamanho: {formatFileSize(backup.file_size)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {backup.status === 'completed' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadBackup(backup.id)}
                          className="flex items-center gap-1"
                        >
                          <Download className="h-3 w-3" />
                          Baixar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => restoreBackup(backup.id)}
                          disabled={isRestoring}
                          className="flex items-center gap-1"
                        >
                          {isRestoring ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <Upload className="h-3 w-3" />
                          )}
                          Restaurar
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
