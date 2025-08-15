import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Wifi, 
  WifiOff, 
  Download, 
  RefreshCw, 
  Trash2, 
  CheckCircle, 
  Clock,
  Database,
  Smartphone
} from 'lucide-react';
import { useCache } from '@/hooks/useCache';

export const CacheStatus = () => {
  const {
    isOnline,
    isInstalled,
    cacheSize,
    lastSync,
    pendingSync,
    clearCache,
    forceSync,
    checkCacheSize
  } = useCache();

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Nunca';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'Agora mesmo';
    if (minutes < 60) return `${minutes}min atrás`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h atrás`;
    return `${Math.floor(minutes / 1440)}d atrás`;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Database className="h-4 w-4" />
          Status do Sistema
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Status Online/Offline */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span className="text-sm">Conexão</span>
          </div>
          <Badge variant={isOnline ? "default" : "destructive"}>
            {isOnline ? "Online" : "Offline"}
          </Badge>
        </div>

        {/* Status PWA */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isInstalled ? (
              <Smartphone className="h-4 w-4 text-blue-500" />
            ) : (
              <Download className="h-4 w-4 text-gray-500" />
            )}
            <span className="text-sm">Aplicativo</span>
          </div>
          <Badge variant={isInstalled ? "default" : "secondary"}>
            {isInstalled ? "Instalado" : "Navegador"}
          </Badge>
        </div>

        {/* Tamanho do Cache */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-purple-500" />
            <span className="text-sm">Cache</span>
          </div>
          <Badge variant="outline">
            {cacheSize} itens
          </Badge>
        </div>

        {/* Última Sincronização */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500" />
            <span className="text-sm">Sincronização</span>
          </div>
          <div className="flex items-center gap-2">
            {pendingSync && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <RefreshCw className="h-3 w-3 text-blue-500" />
              </motion.div>
            )}
            <span className="text-xs text-muted-foreground">
              {formatLastSync(lastSync)}
            </span>
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={forceSync}
            disabled={!isOnline || pendingSync}
            className="flex-1"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Sincronizar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={clearCache}
            className="flex-1"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Limpar Cache
          </Button>
        </div>

        {/* Indicador de Performance */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Performance</span>
            <div className="flex items-center gap-1">
              {cacheSize > 50 ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : (
                <Clock className="h-3 w-3 text-yellow-500" />
              )}
              <span className={cacheSize > 50 ? "text-green-600" : "text-yellow-600"}>
                {cacheSize > 50 ? "Ótima" : "Carregando"}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
