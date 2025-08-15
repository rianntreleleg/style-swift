import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Download, 
  Smartphone, 
  Zap, 
  Share,
  ArrowDown,
  Sparkles,
  Wifi
} from 'lucide-react';
import LogoIcon from '@/components/LogoIcon';

interface PWAFixedPromptProps {
  isVisible: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isInstallable: boolean;
  onInstall: () => Promise<void>;
  onDismiss: () => void;
}

export const PWAFixedPrompt: React.FC<PWAFixedPromptProps> = ({
  isVisible,
  isIOS,
  isAndroid,
  isInstallable,
  onInstall,
  onDismiss
}) => {
  const handleInstall = async () => {
    await onInstall();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-background via-background to-transparent"
        >
          <Card className="mx-auto max-w-md bg-gradient-to-r from-primary via-primary/90 to-primary border-0 shadow-2xl">
            <div className="p-4 text-primary-foreground">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
                  >
                    <LogoIcon size="md" variant="light" />
                  </motion.div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-sm">Instalar StyleSwift</h4>
                      <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                        <Sparkles className="h-2 w-2 mr-1" />
                        Grátis
                      </Badge>
                    </div>
                    <p className="text-xs opacity-90">
                      {isIOS ? '📱 Adicione à tela inicial para acesso rápido' : 
                       '🚀 Instale como app para melhor experiência'}
                    </p>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                  className="text-white hover:bg-white/10 p-2 h-auto"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Quick benefits */}
              <div className="flex items-center gap-4 mb-3 text-xs opacity-75">
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  <span>Mais rápido</span>
                </div>
                <div className="flex items-center gap-1">
                  <Wifi className="h-3 w-3" />
                  <span>Funciona offline</span>
                </div>
                <div className="flex items-center gap-1">
                  <Smartphone className="h-3 w-3" />
                  <span>Como app nativo</span>
                </div>
              </div>

              <div className="flex gap-2">
                {isIOS ? (
                  <>
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={handleInstall}
                      className="flex-1 bg-white text-primary hover:bg-white/90 font-medium"
                    >
                      <Share className="h-3 w-3 mr-2" />
                      Como Instalar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={onDismiss}
                      className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                    >
                      Depois
                    </Button>
                  </>
                ) : isInstallable ? (
                  <>
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={handleInstall}
                      className="flex-1 bg-white text-primary hover:bg-white/90 font-medium"
                    >
                      <Download className="h-3 w-3 mr-2" />
                      Instalar App
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={onDismiss}
                      className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                    >
                      Depois
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={handleInstall}
                      className="flex-1 bg-white text-primary hover:bg-white/90 font-medium"
                    >
                      <Smartphone className="h-3 w-3 mr-2" />
                      Ver Instruções
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={onDismiss}
                      className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                    >
                      Agora não
                    </Button>
                  </>
                )}
              </div>

              {/* iOS hint */}
              {isIOS && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="mt-3 p-2 bg-white/10 rounded-md"
                >
                  <div className="flex items-center gap-2 text-xs">
                    <ArrowDown className="h-3 w-3" />
                    <span>Toque em </span>
                    <Share className="h-3 w-3" />
                    <span> na barra inferior do Safari</span>
                  </div>
                </motion.div>
              )}
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAFixedPrompt;
