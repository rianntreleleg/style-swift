-- Criar bucket para assets dos tenants (logos, imagens)
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-assets', 'tenant-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir que usuários autenticados façam upload de arquivos dos seus próprios tenants
CREATE POLICY "Tenant owners can upload assets" ON storage.objects
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND
  bucket_id = 'tenant-assets' AND
  (storage.foldername(name))[1] = 'logos'
);

-- Política para permitir que usuários autenticados vejam arquivos dos seus próprios tenants
CREATE POLICY "Tenant owners can view assets" ON storage.objects
FOR SELECT 
USING (
  bucket_id = 'tenant-assets' AND
  auth.uid() IS NOT NULL
);

-- Política para permitir que usuários autenticados deletem arquivos dos seus próprios tenants
CREATE POLICY "Tenant owners can delete assets" ON storage.objects
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND
  bucket_id = 'tenant-assets' AND
  (storage.foldername(name))[1] = 'logos'
);

-- Política para permitir que todos vejam as imagens publicamente (para logos em páginas públicas)
CREATE POLICY "Public can view tenant assets" ON storage.objects
FOR SELECT 
USING (bucket_id = 'tenant-assets');
