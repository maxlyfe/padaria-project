-- =====================================================
-- PADARIA PDV - POLÍTICAS DE STORAGE
-- Execute no SQL Editor do Supabase (aba Storage)
-- =====================================================

-- Criar buckets
insert into storage.buckets (id, name, public) 
values 
  ('produtos', 'produtos', true),
  ('combos', 'combos', true)
on conflict (id) do nothing;

-- Políticas para bucket 'produtos'
CREATE POLICY "Imagens de produtos - leitura pública" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'produtos');

CREATE POLICY "Admins podem fazer upload de produtos" 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'produtos' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins podem deletar imagens de produtos" 
  ON storage.objects FOR DELETE 
  USING (
    bucket_id = 'produtos' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Políticas para bucket 'combos'
CREATE POLICY "Imagens de combos - leitura pública" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'combos');

CREATE POLICY "Admins podem fazer upload de combos" 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'combos' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins podem deletar imagens de combos" 
  ON storage.objects FOR DELETE 
  USING (
    bucket_id = 'combos' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
