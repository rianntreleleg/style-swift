import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Download, 
  Smartphone, 
  Zap, 
  Wifi,
  Share,
  Plus,
  Home,
  ArrowUp,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import LogoIcon from '@/components/LogoIcon';
import PWAInstallModal from '@/components/PWAInstallModal';

interface PWAInstallBannerProps {
  isVisible: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isInstallable: boolean;
  onInstall: () => Promise<void>;
  onDismiss: () => void;
  variant?: 'banner' | 'modal' | 'floating';
}

const iOSInstructions = [
  { icon: Share, text: 'Toque no ícone de compartilhar', highlight: 'Share' },
  { icon: Plus, text: 'Selecione "Adicionar à Tela Inicial"', highlight: 'Adicionar' },
  { icon: Home, text: 'Confirme a instalação', highlight: 'Confirmar' }
];

const AndroidInstructions = [
  { icon: Download, text: 'Toque em "Instalar App"', highlight: 'Instalar' },
  { icon: Home, text: 'Confirme a instalação', highlight: 'Confirmar' }
];

const PWABenefits = [
  { icon: Zap, text: 'Acesso instantâneo', color: 'text-yellow-500' },
  { icon: Wifi, text: 'Funciona offline', color: 'text-blue-500' },
  { icon: Smartphone, text: 'Como app nativo', color: 'text-purple-500' }
];

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({
  isVisible,
  isIOS,
  isAndroid,
  isInstallable,
  onInstall,
  onDismiss,
  variant = 'banner'
}) => {
  const [showModal, setShowModal] = useState(false);

  const handleInstall = async () => {
    if (isInstallable) {
      await onInstall();
    } else {
      // Se não pode instalar automaticamente, abrir modal com instruções
      setShowModal(true);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
  };

  if (variant === 'banner') {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 left-0 right-0 z-50 p-4"
          >
            <Card className="mx-auto max-w-4xl bg-gradient-to-r from-slate-900 via-blue-900 to-blue-800 border-0 shadow-2xl backdrop-blur-sm">
              <div className="flex items-center justify-between p-6 text-white">
                <div className="flex items-center gap-4">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  >
                    <LogoIcon size="lg" variant="light" />
                  </motion.div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg">Instale o StyleSwift</h3>
                      <Badge variant="secondary" className="bg-blue-500/30 text-blue-100 border-blue-400/50">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Grátis
                      </Badge>
                    </div>
                    <p className="text-sm opacity-90">
                      {isIOS ? 'Acesso rápido direto da sua tela inicial' : 
                       isAndroid ? 'Instale como app nativo no seu dispositivo' :
                       'Tenha acesso mais rápido ao sistema'}
                    </p>
                    
                    {/* Benefits */}
                    <div className="hidden sm:flex items-center gap-4 mt-2">
                      {PWABenefits.map((benefit, index) => {
                        const Icon = benefit.icon;
                        return (
                          <div key={index} className="flex items-center gap-1 text-xs opacity-75">
                            <Icon className="h-3 w-3" />
                            <span>{benefit.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {isIOS ? (
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={handleInstall}
                      className="bg-blue-600/20 hover:bg-blue-500/30 text-blue-100 border-blue-400/50"
                    >
                      <Share className="h-4 w-4 mr-2" />
                      Como Instalar
                    </Button>
                  ) : isInstallable ? (
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={handleInstall}
                      className="bg-blue-500 hover:bg-blue-600 text-white border-0"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Instalar App
                    </Button>
                  ) : (
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={handleInstall}
                      className="bg-blue-600/20 hover:bg-blue-500/30 text-blue-100 border-blue-400/50"
                    >
                      <Smartphone className="h-4 w-4 mr-2" />
                      Instruções
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDismiss}
                    className="text-blue-100 hover:bg-blue-600/20 p-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  if (variant === 'modal') {
    return (
      <AnimatePresence>
        {isVisible && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={onDismiss}
            />
            
            {/* Modal */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <Card className="w-full max-w-md bg-background border-0 shadow-2xl">
                
                <div className="p-6">
                  {/* Header */}
                  
                  <div className="text-center mb-6">
                    <div className="flex justify-center mb-4">
                      <div className="relative">
                        <LogoIcon size="xl" />
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                          className="absolute -top-1 -right-1"
                        >
                          <Sparkles className="h-6 w-6 text-primary" />
                        </motion.div>
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Instalar StyleSwift</h2>
                    <p className="text-muted-foreground">
                      Tenha acesso mais rápido e conveniente ao sistema
                    </p>
                  </div>

                  {/* Benefits */}
                  <div className="space-y-3 mb-6">
                    {PWABenefits.map((benefit, index) => {
                      const Icon = benefit.icon;
                      return (
                        <motion.div
                          key={index}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                        >
                          <Icon className={cn("h-5 w-5", benefit.color)} />
                          <span className="font-medium">{benefit.text}</span>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Instructions */}
                  {isIOS && (
                    <div className="mb-6">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Share className="h-4 w-4" />
                        Como instalar no iOS:
                      </h3>
                      <div className="space-y-2">
                        {iOSInstructions.map((step, index) => {
                          const Icon = step.icon;
                          return (
                            <div key={index} className="flex items-center gap-3 text-sm">
                              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                                {index + 1}
                              </div>
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {step.text.split(step.highlight).map((part, i) => (
                                  i === 0 ? part : 
                                  <React.Fragment key={i}>
                                    <strong className="text-primary">{step.highlight}</strong>
                                    {part}
                                  </React.Fragment>
                                ))}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3">
                    {isIOS ? (
                      <Button onClick={onDismiss} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                        <Share className="h-4 w-4 mr-2" />
                        Entendi
                      </Button>
                    ) : isInstallable ? (
                      <Button onClick={handleInstall} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                        <Download className="h-4 w-4 mr-2" />
                        Instalar Agora
                      </Button>
                    ) : (
                      <Button onClick={onDismiss} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                        <Smartphone className="h-4 w-4 mr-2" />
                        Ok
                      </Button>
                    )}
                    <Button variant="outline" onClick={onDismiss} className="border-gray-300 text-gray-700 hover:bg-gray-50">
                      Agora não
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Floating variant
  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ scale: 0, opacity: 0, x: 100 }}
            animate={{ scale: 1, opacity: 1, x: 0 }}
            exit={{ scale: 0, opacity: 0, x: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-4 right-4 z-50 max-w-sm"
          >
            <Card className="bg-gradient-to-br from-slate-900 via-blue-900 to-blue-800 border-0 shadow-2xl text-white backdrop-blur-sm">
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <LogoIcon size="md" variant="light" />
                    <div>
                      <h4 className="font-bold text-sm">Instalar App</h4>
                      <p className="text-xs opacity-90">Acesso mais rápido</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDismiss}
                                         className="text-blue-100 hover:bg-blue-600/20 p-1 h-auto"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                <div className="flex gap-2">
                  {isIOS ? (
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={handleInstall}
                      className="flex-1 bg-white/10 hover:bg-white/20 text-white border-white/20"
                    >
                      <Share className="h-3 w-3 mr-1" />
                      Como
                    </Button>
                  ) : isInstallable ? (
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={handleInstall}
                                             className="flex-1 bg-blue-500 hover:bg-blue-600 text-white border-0"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Instalar
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={handleInstall}
                      className="flex-1 bg-white/10 hover:bg-white/20 text-white border-white/20"
                    >
                      <Smartphone className="h-3 w-3 mr-1" />
                      Instruções
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Instruções */}
      <PWAInstallModal
        isVisible={showModal}
        isIOS={isIOS}
        isAndroid={isAndroid}
        isInstallable={isInstallable}
        onInstall={onInstall}
        onClose={handleModalClose}
      />
    </>
  );
};

export default PWAInstallBanner;
