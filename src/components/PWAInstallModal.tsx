import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Download, 
  Smartphone, 
  Share,
  Plus,
  Home,
  MoreHorizontal,
  ArrowDown,
  Zap,
  Wifi,
  Check,
  ChevronRight,
  Sparkles,
  Chrome,
  Globe
} from 'lucide-react';
import LogoIcon from '@/components/LogoIcon';

interface PWAInstallModalProps {
  isVisible: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isInstallable: boolean;
  onInstall: () => Promise<void>;
  onClose: () => void;
}

const PWABenefits = [
  { 
    icon: Zap, 
    title: 'Acesso Instantâneo', 
    description: 'Abra direto da tela inicial, sem digitação',
    color: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' 
  },
  { 
    icon: Wifi, 
    title: 'Funciona Offline', 
    description: 'Continue usando mesmo sem internet',
    color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/20' 
  },
  { 
    icon: Smartphone, 
    title: 'Como App Nativo', 
    description: 'Experiência completa de aplicativo',
    color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/20' 
  }
];

const ChromeInstructions = [
  { 
    step: 1,
    icon: MoreHorizontal,
    text: 'Abra o menu do Chrome',
    detail: 'Toque nos três pontos no canto superior direito'
  },
  { 
    step: 2,
    icon: Download,
    text: 'Selecione "Instalar App"',
    detail: 'Procure pela opção "Adicionar à tela inicial" ou "Instalar App"'
  },
  { 
    step: 3,
    icon: Check,
    text: 'Confirme a instalação',
    detail: 'Toque em "Instalar" na caixa de confirmação'
  }
];

const iOSInstructions = [
  { 
    step: 1,
    icon: Share,
    text: 'Toque no botão de compartilhar',
    detail: 'O ícone de compartilhar na barra inferior do Safari'
  },
  { 
    step: 2,
    icon: Plus,
    text: 'Selecione "Adicionar à Tela Inicial"',
    detail: 'Role para baixo se necessário para encontrar esta opção'
  },
  { 
    step: 3,
    icon: Home,
    text: 'Confirme "Adicionar"',
    detail: 'Toque em "Adicionar" no canto superior direito'
  }
];

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isVisible,
  isIOS,
  isAndroid,
  isInstallable,
  onInstall,
  onClose
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  
  const instructions = isIOS ? iOSInstructions : ChromeInstructions;
  const browserIcon = isIOS ? Globe : Chrome;

  const handleInstall = async () => {
    if (isInstallable) {
      await onInstall();
      onClose();
    }
  };

  const nextStep = () => {
    if (currentStep < instructions.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <Card className="w-full max-w-lg bg-background border-0 shadow-2xl overflow-hidden">
              
              {/* Header */}
              <div className="relative p-6 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="absolute top-4 right-4 text-white hover:bg-white/10 p-2"
                >
                  <X className="h-4 w-4" />
                </Button>
                
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="relative">
                      <LogoIcon size="xl" variant="light" />
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                        className="absolute -top-2 -right-2"
                      >
                        <Sparkles className="h-6 w-6 text-yellow-300" />
                      </motion.div>
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Instalar StyleSwift</h2>
                  <p className="text-primary-foreground/90">
                    Tenha acesso mais rápido e conveniente ao sistema
                  </p>
                </div>
              </div>

              <div className="p-6">
                {/* Benefits */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-4 text-center">Por que instalar?</h3>
                  <div className="grid gap-3">
                    {PWABenefits.map((benefit, index) => {
                      const Icon = benefit.icon;
                      return (
                        <motion.div
                          key={index}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: index * 0.1 }}
                          className={`flex items-start gap-3 p-3 rounded-lg ${benefit.color}`}
                        >
                          <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="font-medium text-sm">{benefit.title}</div>
                            <div className="text-xs opacity-75 mt-0.5">{benefit.description}</div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Browser Detection */}
                <div className="mb-6 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <browserIcon className="h-5 w-5" />
                    <span className="text-sm font-medium">
                      {isIOS ? 'Safari (iOS)' : 'Chrome/Edge'}
                    </span>
                  </div>
                  {isIOS && (
                    <p className="text-xs text-muted-foreground">
                      No iOS, use o Safari para instalar PWAs
                    </p>
                  )}
                </div>

                {/* Installation Steps */}
                {(isIOS || !isInstallable) && (
                  <div className="mb-6">
                    <h3 className="font-semibold mb-4 text-center">
                      Como instalar:
                    </h3>
                    
                    {/* Step Indicator */}
                    <div className="flex items-center justify-center mb-4">
                      {instructions.map((_, index) => (
                        <React.Fragment key={index}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                            index <= currentStep 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {index + 1}
                          </div>
                          {index < instructions.length - 1 && (
                            <div className={`w-8 h-1 transition-colors ${
                              index < currentStep ? 'bg-primary' : 'bg-muted'
                            }`} />
                          )}
                        </React.Fragment>
                      ))}
                    </div>

                    {/* Current Step */}
                    <motion.div
                      key={currentStep}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-center"
                    >
                      <div className="flex justify-center mb-3">
                        {React.createElement(instructions[currentStep].icon, {
                          className: "h-8 w-8 text-primary"
                        })}
                      </div>
                      <h4 className="font-semibold mb-2">
                        {instructions[currentStep].text}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        {instructions[currentStep].detail}
                      </p>
                    </motion.div>

                    {/* Step Navigation */}
                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={prevStep}
                        disabled={currentStep === 0}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={nextStep}
                        disabled={currentStep === instructions.length - 1}
                      >
                        Próximo
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  {isInstallable ? (
                    <Button onClick={handleInstall} className="flex-1">
                      <Download className="h-4 w-4 mr-2" />
                      Instalar Agora
                    </Button>
                  ) : (
                    <Button onClick={onClose} className="flex-1">
                      <Check className="h-4 w-4 mr-2" />
                      Entendi
                    </Button>
                  )}
                  
                  <Button variant="outline" onClick={onClose}>
                    {isInstallable ? 'Agora não' : 'Fechar'}
                  </Button>
                </div>

                {/* Footer note */}
                <div className="mt-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    💡 Você pode instalar a qualquer momento através do menu do navegador
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallModal;
