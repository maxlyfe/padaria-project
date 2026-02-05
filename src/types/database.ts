export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'admin' | 'caixa' | 'cozinha' | 'garcom';
export type OrderStatus = 'pendente' | 'em_producao' | 'pronto' | 'entregue' | 'cancelado';
export type PaymentMethod = 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix';
export type TableStatus = 'livre' | 'ocupada' | 'fechada';
export type CashierStatus = 'aberto' | 'fechado';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          nome: string;
          role: UserRole;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          nome: string;
          role: UserRole;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          nome?: string;
          role?: UserRole;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      produtos: {
        Row: {
          id: string;
          nome: string;
          descricao: string | null;
          foto_url: string | null;
          valor: number;
          feito_pela_cozinha: boolean;
          ativo: boolean;
          categoria: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          descricao?: string | null;
          foto_url?: string | null;
          valor: number;
          feito_pela_cozinha?: boolean;
          ativo?: boolean;
          categoria?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          descricao?: string | null;
          foto_url?: string | null;
          valor?: number;
          feito_pela_cozinha?: boolean;
          ativo?: boolean;
          categoria?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      combos: {
        Row: {
          id: string;
          nome: string;
          descricao: string | null;
          foto_url: string | null;
          valor_total_produtos: number;
          valor_venda: number;
          feito_pela_cozinha: boolean;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          descricao?: string | null;
          foto_url?: string | null;
          valor_total_produtos: number;
          valor_venda: number;
          feito_pela_cozinha?: boolean;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          descricao?: string | null;
          foto_url?: string | null;
          valor_total_produtos?: number;
          valor_venda?: number;
          feito_pela_cozinha?: boolean;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      combo_produtos: {
        Row: {
          id: string;
          combo_id: string;
          produto_id: string;
          quantidade: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          combo_id: string;
          produto_id: string;
          quantidade?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          combo_id?: string;
          produto_id?: string;
          quantidade?: number;
          created_at?: string;
        };
      };
      mesas: {
        Row: {
          id: string;
          numero: number;
          nome: string | null;
          status: TableStatus;
          conta_atual_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          numero: number;
          nome?: string | null;
          status?: TableStatus;
          conta_atual_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          numero?: number;
          nome?: string | null;
          status?: TableStatus;
          conta_atual_id?: string | null;
          created_at?: string;
        };
      };
      contas: {
        Row: {
          id: string;
          mesa_id: string | null;
          nome_cliente: string | null;
          tipo: 'mesa' | 'avulso';
          status: 'aberta' | 'fechada' | 'cancelada';
          valor_total: number;
          valor_desconto: number;
          taxa_servico_percentual: number;
          valor_taxa_servico: number;
          valor_final: number;
          aberta_por: string;
          fechada_por: string | null;
          aberta_em: string;
          fechada_em: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          mesa_id?: string | null;
          nome_cliente?: string | null;
          tipo?: 'mesa' | 'avulso';
          status?: 'aberta' | 'fechada' | 'cancelada';
          valor_total?: number;
          valor_desconto?: number;
          taxa_servico_percentual?: number;
          valor_taxa_servico?: number;
          valor_final?: number;
          aberta_por: string;
          fechada_por?: string | null;
          aberta_em?: string;
          fechada_em?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          mesa_id?: string | null;
          nome_cliente?: string | null;
          tipo?: 'mesa' | 'avulso';
          status?: 'aberta' | 'fechada' | 'cancelada';
          valor_total?: number;
          valor_desconto?: number;
          taxa_servico_percentual?: number;
          valor_taxa_servico?: number;
          valor_final?: number;
          aberta_por?: string;
          fechada_por?: string | null;
          aberta_em?: string;
          fechada_em?: string | null;
          created_at?: string;
        };
      };
      conta_itens: {
        Row: {
          id: string;
          conta_id: string;
          produto_id: string | null;
          combo_id: string | null;
          tipo: 'produto' | 'combo';
          nome: string;
          quantidade: number;
          valor_unitario: number;
          valor_total: number;
          observacoes: string | null;
          status: OrderStatus;
          enviado_para_cozinha: boolean;
          enviado_em: string | null;
          entregue_em: string | null;
          tempo_producao_segundos: number | null;
          cancelado: boolean;
          cancelado_por: string | null;
          cancelado_em: string | null;
          motivo_cancelamento: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conta_id: string;
          produto_id?: string | null;
          combo_id?: string | null;
          tipo: 'produto' | 'combo';
          nome: string;
          quantidade: number;
          valor_unitario: number;
          valor_total: number;
          observacoes?: string | null;
          status?: OrderStatus;
          enviado_para_cozinha?: boolean;
          enviado_em?: string | null;
          entregue_em?: string | null;
          tempo_producao_segundos?: number | null;
          cancelado?: boolean;
          cancelado_por?: string | null;
          cancelado_em?: string | null;
          motivo_cancelamento?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conta_id?: string;
          produto_id?: string | null;
          combo_id?: string | null;
          tipo?: 'produto' | 'combo';
          nome?: string;
          quantidade?: number;
          valor_unitario?: number;
          valor_total?: number;
          observacoes?: string | null;
          status?: OrderStatus;
          enviado_para_cozinha?: boolean;
          enviado_em?: string | null;
          entregue_em?: string | null;
          tempo_producao_segundos?: number | null;
          cancelado?: boolean;
          cancelado_por?: string | null;
          cancelado_em?: string | null;
          motivo_cancelamento?: string | null;
          created_at?: string;
        };
      };
      conta_pagamentos: {
        Row: {
          id: string;
          conta_id: string;
          forma_pagamento: PaymentMethod;
          valor: number;
          registrado_por: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          conta_id: string;
          forma_pagamento: PaymentMethod;
          valor: number;
          registrado_por: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          conta_id?: string;
          forma_pagamento?: PaymentMethod;
          valor?: number;
          registrado_por?: string;
          created_at?: string;
        };
      };
      caixas: {
        Row: {
          id: string;
          data: string;
          status: CashierStatus;
          aberto_por: string;
          fechado_por: string | null;
          fundo_de_caixa: number;
          aberto_em: string;
          fechado_em: string | null;
          total_vendas_dinheiro: number;
          total_vendas_cartao_credito: number;
          total_vendas_cartao_debito: number;
          total_vendas_pix: number;
          total_descontos: number;
          total_taxa_servico: number;
          total_gastos: number;
          observacoes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          data?: string;
          status?: CashierStatus;
          aberto_por: string;
          fechado_por?: string | null;
          fundo_de_caixa: number;
          aberto_em?: string;
          fechado_em?: string | null;
          total_vendas_dinheiro?: number;
          total_vendas_cartao_credito?: number;
          total_vendas_cartao_debito?: number;
          total_vendas_pix?: number;
          total_descontos?: number;
          total_taxa_servico?: number;
          total_gastos?: number;
          observacoes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          data?: string;
          status?: CashierStatus;
          aberto_por?: string;
          fechado_por?: string | null;
          fundo_de_caixa?: number;
          aberto_em?: string;
          fechado_em?: string | null;
          total_vendas_dinheiro?: number;
          total_vendas_cartao_credito?: number;
          total_vendas_cartao_debito?: number;
          total_vendas_pix?: number;
          total_descontos?: number;
          total_taxa_servico?: number;
          total_gastos?: number;
          observacoes?: string | null;
          created_at?: string;
        };
      };
      caixa_lancamentos: {
        Row: {
          id: string;
          caixa_id: string;
          tipo: 'saida' | 'entrada';
          descricao: string;
          valor: number;
          forma_pagamento: PaymentMethod;
          registrado_por: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          caixa_id: string;
          tipo: 'saida' | 'entrada';
          descricao: string;
          valor: number;
          forma_pagamento: PaymentMethod;
          registrado_por: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          caixa_id?: string;
          tipo?: 'saida' | 'entrada';
          descricao?: string;
          valor?: number;
          forma_pagamento?: PaymentMethod;
          registrado_por?: string;
          created_at?: string;
        };
      };
      configuracoes: {
        Row: {
          id: string;
          chave: string;
          valor: string;
          descricao: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          chave: string;
          valor: string;
          descricao?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          chave?: string;
          valor?: string;
          descricao?: string | null;
          updated_at?: string;
        };
      };
    };
  };
}
