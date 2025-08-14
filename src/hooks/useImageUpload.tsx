import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface UploadOptions {
  bucket: string;
  folder?: string;
  maxSizeKB?: number;
  allowedTypes?: string[];
  compressQuality?: number;
}

interface UploadResult {
  url: string | null;
  path: string;
}

export const useImageUpload = () => {
  const [uploading, setUploading] = useState(false);

  const compressImage = (file: File, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calcular dimensões mantendo proporção
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 600;
        
        let { width, height } = img;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = (height * MAX_WIDTH) / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = (width * MAX_HEIGHT) / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Desenhar imagem redimensionada
        ctx?.drawImage(img, 0, 0, width, height);

        // Converter para blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          file.type,
          quality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const uploadImage = async (
    file: File,
    options: UploadOptions
  ): Promise<UploadResult> => {
    setUploading(true);

    try {
      // Validar tipo de arquivo
      const allowedTypes = options.allowedTypes || ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Tipo de arquivo não suportado. Use JPEG, PNG ou WebP.');
      }

      // Validar tamanho
      const maxSizeBytes = (options.maxSizeKB || 2048) * 1024;
      if (file.size > maxSizeBytes) {
        throw new Error(`Arquivo muito grande. Máximo: ${options.maxSizeKB || 2048}KB`);
      }

      // Comprimir imagem se necessário
      let processedFile = file;
      if (options.compressQuality && options.compressQuality < 1) {
        processedFile = await compressImage(file, options.compressQuality);
      }

      // Gerar nome único para o arquivo
      const fileExt = processedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = options.folder ? `${options.folder}/${fileName}` : fileName;

      // Verificar se o bucket existe, se não, usar um bucket padrão
      let bucketName = options.bucket;
      
      // Tentar fazer upload no bucket especificado
      let { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, processedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      // Se o bucket não existir, usar o bucket padrão 'avatars'
      if (error && error.message.includes('Bucket not found')) {
        console.warn(`Bucket ${bucketName} não encontrado, usando bucket padrão 'avatars'`);
        bucketName = 'avatars';
        
        const { data: fallbackData, error: fallbackError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, processedFile, {
            cacheControl: '3600',
            upsert: false,
          });
        
        if (fallbackError) {
          throw fallbackError;
        }
        
        data = fallbackData;
      } else if (error) {
        throw error;
      }

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(data.path);

      return {
        url: urlData.publicUrl,
        path: data.path,
      };

    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast({
        title: 'Erro no upload',
        description: error.message || 'Erro desconhecido ao fazer upload da imagem',
        variant: 'destructive',
      });
      
      return {
        url: null,
        path: '',
      };
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (bucket: string, path: string): Promise<boolean> => {
    try {
      let { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      // Se o bucket não existir, tentar no bucket padrão
      if (error && error.message.includes('Bucket not found')) {
        console.warn(`Bucket ${bucket} não encontrado, tentando no bucket padrão 'avatars'`);
        const { error: fallbackError } = await supabase.storage
          .from('avatars')
          .remove([path]);
        
        if (fallbackError) {
          throw fallbackError;
        }
      } else if (error) {
        throw error;
      }

      return true;
    } catch (error: any) {
      console.error('Erro ao deletar imagem:', error);
      toast({
        title: 'Erro ao deletar imagem',
        description: error.message || 'Erro desconhecido',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    uploadImage,
    deleteImage,
    uploading,
  };
};
