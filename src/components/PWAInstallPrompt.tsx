import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePWA } from '@/hooks/usePWA';
import { Download, X, Smartphone, Monitor, Wifi, Bell, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PWAInstallPromptProps {
  variant?: 'card' | 'button' | 'banner';
  showBenefits?: boolean;
  className?: string;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  variant = 'card',
  showBenefits = true,
  className = ''
}) => {
  const { 
    canInstall, 
    isInstalled, 
    isIOS, 
    isAndroid, 
    showInstallPrompt, 
    dismissInstallPrompt 
  } = usePWA();
  
  const [isDismissed, setIsDismissed] = useState(false);

  // Não mostrar se já está instalado ou foi dispensado
  if (isInstalled || isDismissed || !canInstall) {
    return null;
  }

  const handleInstall = async () => {
    if (isIOS) {
      // Para iOS, mostrar instruções manuais
      setIsDismissed(true);
      // Aqui poderia abrir um modal com instruções
      alert('Para instalar no iOS:\n1. Toque no ícone de compartilhar\n2. Selecione "Adicionar à Tela Inicial"');
      return;
    }
    
    await showInstallPrompt();
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    dismissInstallPrompt();
  };

  const benefits = [
    {
      icon: <Smartphone className="h-4 w-4" />,
      title: 'Acesso Rápido',
      description: 'Abra direto da tela inicial'
    },
    {
      icon: <Wifi className="h-4 w-4" />,
      title: 'Funciona Offline',
      description: 'Use mesmo sem internet'
    },
    {
      icon: <Bell className="h-4 w-4" />,
      title: 'Notificações',
      description: 'Receba lembretes importantes'
    },
    {
      icon: <Clock className="h-4 w-4" />,
      title: 'Sempre Atualizado',
      description: 'Atualizações automáticas'
    }
  ];

  if (variant === 'button') {
    return (
      <Button
        onClick={handleInstall}
        className={`bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white ${className}`}
      >
        <Download className="h-4 w-4 mr-2" />
        Instalar App
      </Button>
    );
  }

  if (variant === 'banner') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className={`bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between ${className}`}
        >
          <div className="flex items-center gap-3">
            <Download className="h-5 w-5" />
            <div>
              <p className="font-medium">Instale o StyleSwift</p>
              <p className="text-sm opacity-90">Acesso rápido e funcionalidades offline</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleInstall}
              variant="secondary"
              size="sm"
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              Instalar
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Variant 'card' (default)
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3 }}
      >
        <Card className={`border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 ${className}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Download className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Instalar StyleSwift</CardTitle>
                  <CardDescription>
                    Tenha acesso rápido e funcionalidades offline
                  </CardDescription>
                </div>
              </div>
              <Button
                onClick={handleDismiss}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          {showBenefits && (
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-3 mb-4">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={benefit.title}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-2"
                  >
                    <div className="text-blue-600 mt-0.5">
                      {benefit.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{benefit.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {benefit.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {isIOS ? 'iOS' : isAndroid ? 'Android' : 'Web'}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    PWA
                  </Badge>
                </div>
                
                <Button
                  onClick={handleInstall}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isIOS ? 'Ver Instruções' : 'Instalar Agora'}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};