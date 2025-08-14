import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Image as ImageIcon, X, Crown, Lock, Check } from 'lucide-react';
import { useImageUpload } from '@/hooks/useImageUpload';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface LogoUploadProps {
  tenantId: string;
  currentLogoUrl?: string | null;
  planTier: string;
  onLogoUpdate?: (logoUrl: string | null) => void;
}

export default function LogoUpload({ 
  tenantId, 
  currentLogoUrl, 
  planTier,
  onLogoUpdate 
}: LogoUploadProps) {
  const [logoUrl, setLogoUrl] = useState(currentLogoUrl);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadImage, deleteImage, uploading } = useImageUpload();

  // Verificar se pode usar logo (Professional e Premium)
  const canUseLogo = planTier === 'professional' || planTier === 'premium';

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!canUseLogo) return;

    const file = files[0];
    
    try {
      // Upload da imagem
      const result = await uploadImage(file, {
        bucket: 'tenant-assets',
        folder: `logos/${tenantId}`,
        maxSizeKB: 1024, // 1MB
        compressQuality: 0.8,
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
      });

      if (result.url) {
        // Deletar logo anterior se existir
        if (logoUrl && logoUrl.includes('supabase')) {
          const oldPath = logoUrl.split('/').slice(-2).join('/');
          await deleteImage('tenant-assets', oldPath);
        }

        // Atualizar no banco
        const { error } = await supabase
          .from('tenants')
          .update({ logo_url: result.url })
          .eq('id', tenantId);

        if (error) throw error;

        setLogoUrl(result.url);
        onLogoUpdate?.(result.url);

        toast({
          title: 'Logo atualizada',
          description: 'Logo foi atualizada com sucesso!',
        });
      }

    } catch (error: any) {
      console.error('Erro ao atualizar logo:', error);
      toast({
        title: 'Erro ao atualizar logo',
        description: error.message || 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveLogo = async () => {
    if (!logoUrl || !canUseLogo) return;

    try {
      // Deletar da storage se for arquivo do Supabase
      if (logoUrl.includes('supabase')) {
        const path = logoUrl.split('/').slice(-2).join('/');
        await deleteImage('tenant-assets', path);
      }

      // Atualizar no banco
      const { error } = await supabase
        .from('tenants')
        .update({ logo_url: null })
        .eq('id', tenantId);

      if (error) throw error;

      setLogoUrl(null);
      onLogoUpdate?.(null);

      toast({
        title: 'Logo removida',
        description: 'Logo foi removida com sucesso!',
      });

    } catch (error: any) {
      console.error('Erro ao remover logo:', error);
      toast({
        title: 'Erro ao remover logo',
        description: error.message || 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (canUseLogo) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  const openFileDialog = () => {
    if (canUseLogo) {
      fileInputRef.current?.click();
    }
  };

  return (
    <TooltipProvider>
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Logo do Estabelecimento
                {canUseLogo && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                    <Crown className="h-3 w-3 mr-1" />
                    Pro+
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {canUseLogo 
                  ? 'Personalize sua página com o logo do seu estabelecimento'
                  : 'Disponível nos planos Profissional e Premium'
                }
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Preview da logo atual */}
          <AnimatePresence>
            {logoUrl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center justify-center p-6 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/20"
              >
                <div className="relative">
                  <img
                    src={logoUrl}
                    alt="Logo atual"
                    className="max-h-32 max-w-64 object-contain rounded-lg shadow-md"
                  />
                  {canUseLogo && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-8 w-8 rounded-full p-0"
                      onClick={handleRemoveLogo}
                      disabled={uploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Área de upload */}
          <div className="space-y-4">
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 transition-all duration-200 ${
                canUseLogo
                  ? dragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/20 cursor-pointer'
                  : 'border-muted-foreground/20 bg-muted/10 cursor-not-allowed opacity-60'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={openFileDialog}
            >
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <motion.div
                  animate={{
                    scale: dragActive ? 1.1 : 1,
                    rotate: dragActive ? 5 : 0,
                  }}
                  transition={{ duration: 0.2 }}
                  className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    canUseLogo
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {canUseLogo ? (
                    <Upload className="h-8 w-8" />
                  ) : (
                    <Lock className="h-8 w-8" />
                  )}
                </motion.div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">
                    {canUseLogo 
                      ? 'Clique ou arraste sua logo aqui'
                      : 'Upload de Logo Bloqueado'
                    }
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {canUseLogo
                      ? 'PNG, JPG ou WebP até 1MB. Recomendado: 400x200px'
                      : 'Faça upgrade para Profissional ou Premium'
                    }
                  </p>
                </div>

                {!canUseLogo && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" disabled className="cursor-not-allowed">
                        <Lock className="h-4 w-4 mr-2" />
                        Fazer Upgrade
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Disponível nos planos Profissional e Premium</p>
                      <p className="text-xs text-muted-foreground">
                        Personalize sua página com o logo do seu estabelecimento
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              {/* Loading overlay */}
              <AnimatePresence>
                {uploading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
                      />
                      <span className="text-sm font-medium">Fazendo upload...</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Input oculto */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileInputChange}
              className="hidden"
              disabled={!canUseLogo || uploading}
            />
          </div>

          {/* Informações sobre compressão */}
          {canUseLogo && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="h-3 w-3 text-white" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Otimização Automática
                  </h4>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Suas imagens são automaticamente comprimidas e redimensionadas para 
                    melhor performance, mantendo a qualidade visual.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
