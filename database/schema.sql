-- =====================================================
-- PADARIA PDV - SCHEMA COMPLETO DO BANCO DE DADOS
-- Execute no SQL Editor do Supabase
-- =====================================================

-- =====================================================
-- 1. EXTENSÕES E CONFIGURAÇÕES
-- =====================================================
create extension if not exists "uuid-ossp";

-- =====================================================
-- 2. TIPOS ENUM
-- =====================================================
do $$
begin
  -- Tipo de usuário/role
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('admin', 'caixa', 'cozinha', 'garcom');
  end if;

  -- Status do pedido
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type order_status as enum ('pendente', 'em_producao', 'pronto', 'entregue', 'cancelado');
  end if;

  -- Forma de pagamento
  if not exists (select 1 from pg_type where typname = 'payment_method') then
    create type payment_method as enum ('dinheiro', 'cartao_credito', 'cartao_debito', 'pix');
  end if;

  -- Status da mesa
  if not exists (select 1 from pg_type where typname = 'table_status') then
    create type table_status as enum ('livre', 'ocupada', 'fechada');
  end if;

  -- Status do caixa
  if not exists (select 1 from pg_type where typname = 'cashier_status') then
    create type cashier_status as enum ('aberto', 'fechado');
  end if;
end$$;

-- =====================================================
-- 3. TABELAS
-- =====================================================

-- Perfis de usuário (estende auth.users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  nome text not null,
  role user_role not null default 'garcom',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Produtos
create table if not exists produtos (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  descricao text,
  foto_url text,
  valor decimal(10,2) not null check (valor >= 0),
  feito_pela_cozinha boolean not null default false,
  ativo boolean not null default true,
  categoria text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Combos
create table if not exists combos (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  descricao text,
  foto_url text,
  valor_total_produtos decimal(10,2) not null check (valor_total_produtos >= 0),
  valor_venda decimal(10,2) not null check (valor_venda >= 0),
  feito_pela_cozinha boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Produtos dentro do combo
create table if not exists combo_produtos (
  id uuid primary key default uuid_generate_v4(),
  combo_id uuid not null references combos(id) on delete cascade,
  produto_id uuid not null references produtos(id) on delete cascade,
  quantidade integer not null default 1 check (quantidade > 0),
  created_at timestamptz not null default now(),
  unique(combo_id, produto_id)
);

-- Mesas
create table if not exists mesas (
  id uuid primary key default uuid_generate_v4(),
  numero integer not null unique check (numero > 0),
  nome text,
  status table_status not null default 'livre',
  conta_atual_id uuid,
  created_at timestamptz not null default now()
);

-- Contas (comandas)
create table if not exists contas (
  id uuid primary key default uuid_generate_v4(),
  mesa_id uuid references mesas(id) on delete set null,
  nome_cliente text,
  tipo text not null default 'mesa' check (tipo in ('mesa', 'avulso')),
  status text not null default 'aberta' check (status in ('aberta', 'fechada', 'cancelada')),
  valor_total decimal(10,2) not null default 0 check (valor_total >= 0),
  valor_desconto decimal(10,2) not null default 0 check (valor_desconto >= 0),
  taxa_servico_percentual decimal(5,2) not null default 10 check (taxa_servico_percentual >= 0),
  valor_taxa_servico decimal(10,2) not null default 0 check (valor_taxa_servico >= 0),
  valor_final decimal(10,2) not null default 0 check (valor_final >= 0),
  aberta_por uuid not null references profiles(id),
  fechada_por uuid references profiles(id),
  aberta_em timestamptz not null default now(),
  fechada_em timestamptz,
  created_at timestamptz not null default now()
);

-- Itens da conta
create table if not exists conta_itens (
  id uuid primary key default uuid_generate_v4(),
  conta_id uuid not null references contas(id) on delete cascade,
  produto_id uuid references produtos(id) on delete set null,
  combo_id uuid references combos(id) on delete set null,
  tipo text not null check (tipo in ('produto', 'combo')),
  nome text not null,
  quantidade integer not null check (quantidade > 0),
  valor_unitario decimal(10,2) not null check (valor_unitario >= 0),
  valor_total decimal(10,2) not null check (valor_total >= 0),
  observacoes text,
  status order_status not null default 'pendente',
  enviado_para_cozinha boolean not null default false,
  enviado_em timestamptz,
  entregue_em timestamptz,
  tempo_producao_segundos integer,
  cancelado boolean not null default false,
  cancelado_por uuid references profiles(id),
  cancelado_em timestamptz,
  motivo_cancelamento text,
  created_at timestamptz not null default now()
);

-- Pagamentos da conta
create table if not exists conta_pagamentos (
  id uuid primary key default uuid_generate_v4(),
  conta_id uuid not null references contas(id) on delete cascade,
  forma_pagamento payment_method not null,
  valor decimal(10,2) not null check (valor >= 0),
  registrado_por uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

-- Caixa (fluxo de caixa)
create table if not exists caixas (
  id uuid primary key default uuid_generate_v4(),
  data date not null unique default current_date,
  status cashier_status not null default 'aberto',
  aberto_por uuid not null references profiles(id),
  fechado_por uuid references profiles(id),
  fundo_de_caixa decimal(10,2) not null check (fundo_de_caixa >= 0),
  aberto_em timestamptz not null default now(),
  fechado_em timestamptz,
  total_vendas_dinheiro decimal(10,2) not null default 0,
  total_vendas_cartao_credito decimal(10,2) not null default 0,
  total_vendas_cartao_debito decimal(10,2) not null default 0,
  total_vendas_pix decimal(10,2) not null default 0,
  total_descontos decimal(10,2) not null default 0,
  total_taxa_servico decimal(10,2) not null default 0,
  total_gastos decimal(10,2) not null default 0,
  observacoes text,
  created_at timestamptz not null default now()
);

-- Lançamentos do caixa (gastos/entradas)
create table if not exists caixa_lancamentos (
  id uuid primary key default uuid_generate_v4(),
  caixa_id uuid not null references caixas(id) on delete cascade,
  tipo text not null check (tipo in ('saida', 'entrada')),
  descricao text not null,
  valor decimal(10,2) not null check (valor >= 0),
  forma_pagamento payment_method not null,
  registrado_por uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

-- Configurações do sistema
create table if not exists configuracoes (
  id uuid primary key default uuid_generate_v4(),
  chave text not null unique,
  valor text not null,
  descricao text,
  updated_at timestamptz not null default now()
);

-- =====================================================
-- 4. ÍNDICES
-- =====================================================
create index if not exists idx_profiles_role on profiles(role);
create index if not exists idx_profiles_ativo on profiles(ativo);

create index if not exists idx_produtos_ativo on produtos(ativo);
create index if not exists idx_produtos_cozinha on produtos(feito_pela_cozinha);
create index if not exists idx_produtos_categoria on produtos(categoria);

create index if not exists idx_combos_ativo on combos(ativo);
create index if not exists idx_combo_produtos_combo on combo_produtos(combo_id);

create index if not exists idx_mesas_status on mesas(status);
create index if not exists idx_mesas_conta on mesas(conta_atual_id);

create index if not exists idx_contas_status on contas(status);
create index if not exists idx_contas_mesa on contas(mesa_id);
create index if not exists idx_contas_data on contas(aberta_em);

create index if not exists idx_conta_itens_conta on conta_itens(conta_id);
create index if not exists idx_conta_itens_status on conta_itens(status);
create index if not exists idx_conta_itens_cozinha on conta_itens(enviado_para_cozinha, status);

create index if not exists idx_conta_pagamentos_conta on conta_pagamentos(conta_id);

create index if not exists idx_caixas_data on caixas(data);
create index if not exists idx_caixas_status on caixas(status);

create index if not exists idx_caixa_lancamentos_caixa on caixa_lancamentos(caixa_id);

-- =====================================================
-- 5. FUNÇÕES E TRIGGERS
-- =====================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
create trigger update_profiles_updated_at before update on profiles
  for each row execute function update_updated_at_column();

create trigger update_produtos_updated_at before update on produtos
  for each row execute function update_updated_at_column();

create trigger update_combos_updated_at before update on combos
  for each row execute function update_updated_at_column();

create trigger update_configuracoes_updated_at before update on configuracoes
  for each row execute function update_updated_at_column();

-- Função para calcular tempo de produção quando pedido é entregue
CREATE OR REPLACE FUNCTION calcular_tempo_producao()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'entregue' AND OLD.status != 'entregue' AND NEW.enviado_em IS NOT NULL THEN
    NEW.tempo_producao_segundos = EXTRACT(EPOCH FROM (now() - NEW.enviado_em))::integer;
    NEW.entregue_em = now();
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

create trigger trigger_calcular_tempo_producao before update on conta_itens
  for each row execute function calcular_tempo_producao();

-- Função para atualizar status da mesa quando conta é fechada
CREATE OR REPLACE FUNCTION liberar_mesa_ao_fechar_conta()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'fechada' AND OLD.status = 'aberta' AND NEW.mesa_id IS NOT NULL THEN
    UPDATE mesas SET 
      status = 'livre',
      conta_atual_id = NULL
    WHERE id = NEW.mesa_id;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

create trigger trigger_liberar_mesa after update on contas
  for each row execute function liberar_mesa_ao_fechar_conta();

-- =====================================================
-- 6. POLÍTICAS DE SEGURANÇA (RLS)
-- =====================================================

-- Habilitar RLS em todas as tabelas
alter table profiles enable row level security;
alter table produtos enable row level security;
alter table combos enable row level security;
alter table combo_produtos enable row level security;
alter table mesas enable row level security;
alter table contas enable row level security;
alter table conta_itens enable row level security;
alter table conta_pagamentos enable row level security;
alter table caixas enable row level security;
alter table caixa_lancamentos enable row level security;
alter table configuracoes enable row level security;

-- Políticas para profiles
CREATE POLICY "Usuários podem ver seus próprios perfis" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins podem ver todos os perfis" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins podem inserir perfis" ON profiles
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins podem atualizar perfis" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Políticas para produtos (todos autenticados podem ver, apenas admin edita)
CREATE POLICY "Usuários autenticados podem ver produtos ativos" ON produtos
  FOR SELECT USING (ativo = true);

CREATE POLICY "Admins podem ver todos os produtos" ON produtos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins podem gerenciar produtos" ON produtos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Políticas para combos (similar aos produtos)
CREATE POLICY "Usuários autenticados podem ver combos ativos" ON combos
  FOR SELECT USING (ativo = true);

CREATE POLICY "Admins podem ver todos os combos" ON combos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins podem gerenciar combos" ON combos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Políticas para combo_produtos
CREATE POLICY "Usuários autenticados podem ver produtos dos combos" ON combo_produtos
  FOR SELECT USING (true);

CREATE POLICY "Admins podem gerenciar produtos dos combos" ON combo_produtos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Políticas para mesas (todos autenticados podem ver e atualizar status)
CREATE POLICY "Usuários autenticados podem ver mesas" ON mesas
  FOR SELECT USING (true);

CREATE POLICY "Usuários autenticados podem atualizar mesas" ON mesas
  FOR UPDATE USING (true);

CREATE POLICY "Admins podem gerenciar mesas" ON mesas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Políticas para contas
CREATE POLICY "Usuários autenticados podem ver contas" ON contas
  FOR SELECT USING (true);

CREATE POLICY "Usuários autenticados podem criar contas" ON contas
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Caixa e admin podem fechar contas" ON contas
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'caixa'))
  );

-- Políticas para itens da conta
CREATE POLICY "Usuários autenticados podem ver itens" ON conta_itens
  FOR SELECT USING (true);

CREATE POLICY "Garçom e admin podem criar itens" ON conta_itens
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'garcom'))
  );

CREATE POLICY "Cozinha pode atualizar status dos itens" ON conta_itens
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'cozinha'))
    OR (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'garcom', 'caixa'))
      AND status IN ('pendente', 'cancelado')
    )
  );

-- Políticas para pagamentos
CREATE POLICY "Caixa e admin podem gerenciar pagamentos" ON conta_pagamentos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'caixa'))
  );

-- Políticas para caixa
CREATE POLICY "Caixa e admin podem gerenciar caixa" ON caixas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'caixa'))
  );

CREATE POLICY "Todos podem ver caixa aberto" ON caixas
  FOR SELECT USING (status = 'aberto');

-- Políticas para lançamentos do caixa
CREATE POLICY "Caixa e admin podem gerenciar lançamentos" ON caixa_lancamentos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'caixa'))
  );

-- Políticas para configurações
CREATE POLICY "Todos podem ver configurações" ON configuracoes
  FOR SELECT USING (true);

CREATE POLICY "Admins podem gerenciar configurações" ON configuracoes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 7. DADOS INICIAIS
-- =====================================================

-- Configurações padrão
INSERT INTO configuracoes (chave, valor, descricao) VALUES
  ('taxa_servico_padrao', '10', 'Taxa de serviço padrão em percentual'),
  ('nome_estabelecimento', 'Padaria PDV', 'Nome do estabelecimento'),
  ('endereco_estabelecimento', '', 'Endereço do estabelecimento'),
  ('telefone_estabelecimento', '', 'Telefone do estabelecimento'),
  ('impressora_cozinha_url', '', 'URL da impressora térmica da cozinha'),
  ('impressora_caixa_url', '', 'URL da impressora térmica do caixa')
ON CONFLICT (chave) DO NOTHING;

-- Criar algumas mesas de exemplo (opcional)
-- INSERT INTO mesas (numero, nome) VALUES 
--   (1, 'Mesa 1'),
--   (2, 'Mesa 2'),
--   (3, 'Mesa 3'),
--   (4, 'Mesa 4'),
--   (5, 'Mesa 5')
-- ON CONFLICT (numero) DO NOTHING;

-- =====================================================
-- 8. STORAGE BUCKETS
-- =====================================================
-- Execute no Storage do Supabase ou via SQL:
-- insert into storage.buckets (id, name, public) values ('produtos', 'produtos', true);
-- insert into storage.buckets (id, name, public) values ('combos', 'combos', true);

-- Políticas de storage (executar no SQL editor do Supabase na seção storage)
-- CREATE POLICY "Imagens de produtos públicas" ON storage.objects
--   FOR SELECT USING (bucket_id = 'produtos');
-- 
-- CREATE POLICY "Admins podem fazer upload de imagens" ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'produtos' AND
--     EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
--   );
