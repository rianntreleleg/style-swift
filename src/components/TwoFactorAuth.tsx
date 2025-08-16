import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Smartphone, 
  Mail, 
  Key, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  QrCode,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface TwoFactorAuthProps {
  userId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface TwoFactorMethod {
  id: string;
  type: 'sms' | 'email' | 'authenticator';
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  verified: boolean;
}

export const TwoFactorAuth = ({ userId, onSuccess, onCancel }: TwoFactorAuthProps) => {
  const [methods, setMethods] = useState<TwoFactorMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrCodeData, setQrCodeData] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [step, setStep] = useState<'setup' | 'verify' | 'complete'>('setup');

  const twoFactorMethods: TwoFactorMethod[] = [
    {
      id: 'sms',
      type: 'sms',
      name: 'SMS',
      description: 'Receba códigos via mensagem de texto',
      icon: <Smartphone className="h-5 w-5" />,
      enabled: false,
      verified: false
    },
    {
      id: 'email',
      type: 'email',
      name: 'Email',
      description: 'Receba códigos via email',
      icon: <Mail className="h-5 w-5" />,
      enabled: false,
      verified: false
    },
    {
      id: 'authenticator',
      type: 'authenticator',
      name: 'App Authenticator',
      description: 'Use Google Authenticator ou similar',
      icon: <Key className="h-5 w-5" />,
      enabled: false,
      verified: false
    }
  ];

  useEffect(() => {
    loadTwoFactorMethods();
  }, [userId]);

  const loadTwoFactorMethods = async () => {
    try {
      // Buscar métodos 2FA configurados do usuário
      const { data, error } = await supabase
        .from('user_two_factor')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      const updatedMethods = twoFactorMethods.map(method => {
        const userMethod = data?.find(m => m.method_type === method.type);
        return {
          ...method,
          enabled: !!userMethod?.enabled,
          verified: !!userMethod?.verified
        };
      });

      setMethods(updatedMethods);
    } catch (error) {
      console.error('Erro ao carregar métodos 2FA:', error);
      setMethods(twoFactorMethods);
    }
  };

  const setupTwoFactor = async (methodType: string) => {
    setIsLoading(true);
    try {
      if (methodType === 'authenticator') {
        // Gerar secret key para authenticator
        const { data, error } = await supabase.functions.invoke('generate-2fa-secret', {
          body: { userId, methodType }
        });

        if (error) throw error;

        setSecretKey(data.secret);
        setQrCodeData(data.qrCode);
        setShowQR(true);
        setSelectedMethod(methodType);
        setStep('verify');
      } else {
        // Enviar código via SMS ou email
        const { error } = await supabase.functions.invoke('send-2fa-code', {
          body: { userId, methodType }
        });

        if (error) throw error;

        setSelectedMethod(methodType);
        setStep('verify');
        toast({
          title: "Código de verificação enviado!",
          description: `Um código de verificação foi enviado para seu ${methodType === 'sms' ? 'SMS' : 'email'}. Verifique sua caixa de entrada.`,
        });
      }
    } catch (error) {
      console.error('Erro ao configurar 2FA:', error);
      toast({
        title: "Erro ao configurar 2FA",
        description: "Não foi possível configurar a autenticação de dois fatores. Por favor, tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationCode.trim()) {
      toast({
        title: "Código de verificação obrigatório",
        description: "Por favor, digite o código de verificação de seis dígitos.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('verify-2fa-code', {
        body: { 
          userId, 
          methodType: selectedMethod, 
          code: verificationCode,
          secretKey: selectedMethod === 'authenticator' ? secretKey : undefined
        }
      });

      if (error) throw error;

      // Salvar método 2FA ativado
      await supabase
        .from('user_two_factor')
        .upsert({
          user_id: userId,
          method_type: selectedMethod,
          enabled: true,
          verified: true,
          secret_key: selectedMethod === 'authenticator' ? secretKey : null
        });

      setStep('complete');
      toast({
        title: "Autenticação de dois fatores ativada!",
        description: "A autenticação de dois fatores foi configurada e ativada com sucesso na sua conta.",
      });

      setTimeout(() => {
        onSuccess?.();
      }, 2000);

    } catch (error) {
      console.error('Erro ao verificar código:', error);
      toast({
        title: "Código de verificação inválido",
        description: "O código digitado não é válido. Verifique o código e tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copySecretKey = () => {
    navigator.clipboard.writeText(secretKey);
    toast({
        title: "Chave secreta copiada!",
        description: "A chave secreta foi copiada para a área de transferência com sucesso.",
      });
  };

  const resendCode = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-2fa-code', {
        body: { userId, methodType: selectedMethod }
      });

      if (error) throw error;

      toast({
        title: "Código de verificação reenviado!",
        description: "Um novo código de verificação foi enviado. Verifique seu dispositivo.",
      });
    } catch (error) {
      console.error('Erro ao reenviar código:', error);
      toast({
        title: "Erro ao reenviar código",
        description: "Não foi possível reenviar o código de verificação. Por favor, tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full max-w-md mx-auto"
    >
      <Card className="border-2 border-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Autenticação de Dois Fatores</CardTitle>
          <CardDescription>
            Proteja sua conta com uma camada extra de segurança
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <AnimatePresence mode="wait">
            {step === 'setup' && (
              <motion.div
                key="setup"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div className="text-sm text-muted-foreground text-center">
                  Escolha um método de autenticação:
                </div>

                <Tabs defaultValue="authenticator" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="authenticator" className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      App
                    </TabsTrigger>
                    <TabsTrigger value="sms" className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      SMS
                    </TabsTrigger>
                    <TabsTrigger value="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="authenticator" className="space-y-4">
                    <div className="text-center space-y-2">
                      <Key className="h-8 w-8 mx-auto text-primary" />
                      <h3 className="font-semibold">App Authenticator</h3>
                      <p className="text-sm text-muted-foreground">
                        Use Google Authenticator, Authy ou similar
                      </p>
                    </div>
                    <Button 
                      onClick={() => setupTwoFactor('authenticator')}
                      disabled={isLoading}
                      className="w-full"
                    >
                      {isLoading ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Key className="h-4 w-4 mr-2" />
                      )}
                      Configurar App Authenticator
                    </Button>
                  </TabsContent>

                  <TabsContent value="sms" className="space-y-4">
                    <div className="text-center space-y-2">
                      <Smartphone className="h-8 w-8 mx-auto text-primary" />
                      <h3 className="font-semibold">SMS</h3>
                      <p className="text-sm text-muted-foreground">
                        Receba códigos via mensagem de texto
                      </p>
                    </div>
                    <Button 
                      onClick={() => setupTwoFactor('sms')}
                      disabled={isLoading}
                      className="w-full"
                    >
                      {isLoading ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Smartphone className="h-4 w-4 mr-2" />
                      )}
                      Configurar SMS
                    </Button>
                  </TabsContent>

                  <TabsContent value="email" className="space-y-4">
                    <div className="text-center space-y-2">
                      <Mail className="h-8 w-8 mx-auto text-primary" />
                      <h3 className="font-semibold">Email</h3>
                      <p className="text-sm text-muted-foreground">
                        Receba códigos via email
                      </p>
                    </div>
                    <Button 
                      onClick={() => setupTwoFactor('email')}
                      disabled={isLoading}
                      className="w-full"
                    >
                      {isLoading ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Mail className="h-4 w-4 mr-2" />
                      )}
                      Configurar Email
                    </Button>
                  </TabsContent>
                </Tabs>

                {onCancel && (
                  <Button 
                    variant="outline" 
                    onClick={onCancel}
                    className="w-full"
                  >
                    Cancelar
                  </Button>
                )}
              </motion.div>
            )}

            {step === 'verify' && (
              <motion.div
                key="verify"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                {selectedMethod === 'authenticator' && showQR && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="font-semibold mb-2">Configure seu App Authenticator</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        1. Abra seu app authenticator<br/>
                        2. Escaneie o QR Code ou digite a chave manualmente<br/>
                        3. Digite o código gerado abaixo
                      </p>
                    </div>

                    <div className="flex justify-center">
                      <div className="bg-white p-4 rounded-lg border">
                        <img 
                          src={qrCodeData} 
                          alt="QR Code" 
                          className="w-32 h-32"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="secret-key">Chave Secreta (Manual)</Label>
                      <div className="flex gap-2">
                        <Input
                          id="secret-key"
                          type={showSecret ? "text" : "password"}
                          value={secretKey}
                          readOnly
                          className="font-mono"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setShowSecret(!showSecret)}
                        >
                          {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={copySecretKey}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="font-semibold">Verificação</h3>
                    <p className="text-sm text-muted-foreground">
                      Digite o código de {selectedMethod === 'authenticator' ? 'seu app' : selectedMethod === 'sms' ? 'SMS' : 'email'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="verification-code">Código de Verificação</Label>
                    <Input
                      id="verification-code"
                      type="text"
                      placeholder="000000"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      maxLength={6}
                      className="text-center text-lg font-mono"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={verifyCode}
                      disabled={isLoading || !verificationCode.trim()}
                      className="flex-1"
                    >
                      {isLoading ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Verificar
                    </Button>
                    {selectedMethod !== 'authenticator' && (
                      <Button 
                        variant="outline"
                        onClick={resendCode}
                        disabled={isLoading}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <Button 
                    variant="ghost" 
                    onClick={() => setStep('setup')}
                    className="w-full"
                  >
                    Voltar
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-4"
              >
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">2FA Ativado!</h3>
                  <p className="text-sm text-muted-foreground">
                    Sua conta agora está protegida com autenticação de dois fatores.
                  </p>
                </div>
                <Badge variant="secondary" className="mx-auto">
                  Segurança Reforçada
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};
