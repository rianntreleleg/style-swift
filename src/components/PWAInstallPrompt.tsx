import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Download, Smartphone, Zap, Shield, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PWAInstallPromptProps {
  isVisible: boolean;
  isOnline: boolean;
  isAdmin: boolean;
  onInstall: () => Promise<boolean>;
  onClose: () => void;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  isVisible,
  isOnline,
  isAdmin,
  onInstall,
  onClose
}) => {
  const [isInstalling, setIsInstalling] = React.useState(false);

  const handleInstall = async () => {
    if (!isOnline) {
      alert('Você precisa estar online para instalar o aplicativo.');
      return;
    }

    setIsInstalling(true);
    try {
      const success = await onInstall();
      if (success) {
        onClose();
      }
    } catch (error) {
      console.error('Erro durante a instalação:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto"
        >
          <Card className="border-0 shadow-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center">
                    <Download className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Instalar StyleSwift</CardTitle>
                    <CardDescription className="text-slate-300">
                      Acesse rapidamente no seu dispositivo
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Status de conectividade */}
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi className="h-4 w-4 text-green-400" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-400" />
                )}
                <span className="text-sm text-slate-300">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              {/* Benefícios */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Smartphone className="h-4 w-4 text-cyan-400" />
                  <span>Acesso rápido direto da tela inicial</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-cyan-400" />
                  <span>Funciona offline com sincronização automática</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-cyan-400" />
                  <span>Dados seguros e sincronizados</span>
                </div>
              </div>

              {/* Badge de Admin (apenas se for admin) */}
              {isAdmin && (
                <div className="flex justify-center">
                  <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                    Acesso Exclusivo para Administradores
                  </Badge>
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-2">
                <Button
                  onClick={handleInstall}
                  disabled={!isOnline || isInstalling}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white"
                >
                  {isInstalling ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Instalando...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Instalar App
                    </div>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Agora não
                </Button>
              </div>

              {/* Instruções */}
              <div className="text-xs text-slate-400 text-center">
                {!isOnline && (
                  <p className="text-red-400 mb-2">
                    ⚠️ Conecte-se à internet para instalar
                  </p>
                )}
                <p>
                  O app será adicionado à sua tela inicial e funcionará como um aplicativo nativo
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
