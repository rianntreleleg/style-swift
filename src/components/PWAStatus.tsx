import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Download, Smartphone, Wifi, WifiOff, CheckCircle, XCircle } from 'lucide-react';

interface PWAStatusProps {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  isAdmin: boolean;
  onInstall: () => Promise<boolean>;
  onShowPrompt: () => void;
}

export const PWAStatus: React.FC<PWAStatusProps> = ({
  isInstallable,
  isInstalled,
  isOnline,
  isAdmin,
  onInstall,
  onShowPrompt
}) => {
  if (!isAdmin) {
    return null;
  }

  if (isInstalled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
              <CheckCircle className="h-3 w-3 mr-1" />
              App Instalado
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>StyleSwift está instalado no seu dispositivo</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (!isInstallable) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="bg-slate-500/10 text-slate-600 border-slate-500/30">
              <XCircle className="h-3 w-3 mr-1" />
              Não Instalável
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Instalação não disponível neste dispositivo</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Status de conectividade */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={isOnline ? "bg-green-500/10 text-green-600 border-green-500/30" : "bg-red-500/10 text-red-600 border-red-500/30"}>
              {isOnline ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isOnline ? 'Conectado à internet' : 'Sem conexão com a internet'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Botão de instalação */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              onClick={onShowPrompt}
              disabled={!isOnline}
              className="bg-gradient-to-r from-cyan-500/10 to-cyan-600/10 text-cyan-600 border-cyan-500/30 hover:from-cyan-500/20 hover:to-cyan-600/20"
            >
              <Download className="h-3 w-3 mr-1" />
              Instalar App
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Instalar StyleSwift no seu dispositivo</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
