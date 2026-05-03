-- Criar políticas RLS para o bucket pratos-df-pizzaria
CREATE POLICY "Allow public read access to menu item images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'pratos-df-pizzaria');

CREATE POLICY "Allow authenticated users to upload menu item images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'pratos-df-pizzaria' AND auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to update their uploaded images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'pratos-df-pizzaria' AND auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to delete their uploaded images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'pratos-df-pizzaria' AND auth.uid() IS NOT NULL);