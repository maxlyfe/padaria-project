import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  DollarSign, 
  TrendingUp,
  Lock,
  Unlock,
  Receipt
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';


interface Conta {
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
  aberta_em: string;
  mesa_numero?: number;
}

interface Caixa {
  id: string;
  status: 'aberto' | 'fechado';
  fundo_de_caixa: number;
  total_vendas_dinheiro: number;
  total_vendas_cartao_credito: number;
  total_vendas_cartao_debito: number;
  total_vendas_pix: number;
  total_descontos: number;
  total_taxa_servico: number;
  total_gastos: number;
}

export function Caixa() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const [caixa, setCaixa] = useState<Caixa | null>(null);
  const [contasAbertas, setContasAbertas] = useState<Conta[]>([]);
  const [contaSelecionada, setContaSelecionada] = useState<Conta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Dialog states
  const [abrirCaixaOpen, setAbrirCaixaOpen] = useState(false);
  const [fecharContaOpen, setFecharContaOpen] = useState(false);
  const [fundoCaixa, setFundoCaixa] = useState('');
  const [pagamentos, setPagamentos] = useState<Record<string, number>>({
    dinheiro: 0,
    cartao_credito: 0,
    cartao_debito: 0,
    pix: 0,
  });

  useEffect(() => {
    fetchCaixa();
    fetchContasAbertas();
  }, []);

  const fetchCaixa = async () => {
    const hoje = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('caixas')
      .select('*')
      .eq('data', hoje)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar caixa:', error);
      return;
    }

    setCaixa(data);
  };

  const fetchContasAbertas = async () => {
    const { data, error } = await supabase
      .from('contas')
      .select(`
        *,
        mesas:numero
      `)
      .eq('status', 'aberta')
      .order('aberta_em', { ascending: false });

    if (error) {
      console.error('Erro ao buscar contas:', error);
      return;
    }

    const contasProcessadas = (data || []).map((c: any) => ({
      ...c,
      mesa_numero: c.mesas?.numero,
    }));

    setContasAbertas(contasProcessadas);
  };

  const abrirCaixa = async () => {
    const valor = parseFloat(fundoCaixa);
    if (isNaN(valor) || valor < 0) {
      toast.error('Informe um valor válido para o fundo de caixa');
      return;
    }

    setIsLoading(true);
    
    const { error } = await supabase
      .from('caixas')
      .insert({
        fundo_de_caixa: valor,
        aberto_por: profile?.id,
      });

    if (error) {
      toast.error('Erro ao abrir caixa');
      setIsLoading(false);
      return;
    }

    setAbrirCaixaOpen(false);
    fetchCaixa();
    setIsLoading(false);
    toast.success('Caixa aberto com sucesso!');
  };

  const iniciarFechamento = (conta: Conta) => {
    setContaSelecionada(conta);
    setPagamentos({
      dinheiro: 0,
      cartao_credito: 0,
      cartao_debito: 0,
      pix: 0,
    });
    setFecharContaOpen(true);
  };

  const fecharConta = async () => {
    if (!contaSelecionada) return;

    const totalPagamentos = Object.values(pagamentos).reduce((a, b) => a + b, 0);
    
    if (Math.abs(totalPagamentos - contaSelecionada.valor_final) > 0.01) {
      toast.error(`Total dos pagamentos (R$ ${totalPagamentos.toFixed(2)}) diferente do valor final (R$ ${contaSelecionada.valor_final.toFixed(2)})`);
      return;
    }

    setIsLoading(true);

    // Inserir pagamentos
    const pagamentosInsert = Object.entries(pagamentos)
      .filter(([, valor]) => valor > 0)
      .map(([forma, valor]) => ({
        conta_id: contaSelecionada.id,
        forma_pagamento: forma,
        valor,
        registrado_por: profile?.id,
      }));

    const { error: pagError } = await supabase
      .from('conta_pagamentos')
      .insert(pagamentosInsert);

    if (pagError) {
      toast.error('Erro ao registrar pagamentos');
      setIsLoading(false);
      return;
    }

    // Fechar conta
    const { error: contaError } = await supabase
      .from('contas')
      .update({
        status: 'fechada',
        fechada_por: profile?.id,
        fechada_em: new Date().toISOString(),
      })
      .eq('id', contaSelecionada.id);

    if (contaError) {
      toast.error('Erro ao fechar conta');
      setIsLoading(false);
      return;
    }

    setFecharContaOpen(false);
    setContaSelecionada(null);
    fetchContasAbertas();
    fetchCaixa();
    setIsLoading(false);
    toast.success('Conta fechada com sucesso!');
  };

  const totalVendas = caixa ? 
    caixa.total_vendas_dinheiro + 
    caixa.total_vendas_cartao_credito + 
    caixa.total_vendas_cartao_debito + 
    caixa.total_vendas_pix : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-green-500 rounded-full flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Caixa</h1>
                  <p className="text-sm text-muted-foreground">
                    {caixa?.status === 'aberto' ? 'Caixa Aberto' : 'Caixa Fechado'}
                  </p>
                </div>
              </div>
            </div>
            {caixa?.status === 'aberto' && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total em Caixa</p>
                <p className="text-xl font-bold">R$ {(caixa.fundo_de_caixa + totalVendas).toFixed(2)}</p>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4">
        {!caixa || caixa.status === 'fechado' ? (
          <Card className="text-center py-12">
            <CardContent>
              <Lock className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Caixa Fechado</h2>
              <p className="text-muted-foreground mb-4">
                Abra o caixa para iniciar as operações do dia
              </p>
              <Button onClick={() => setAbrirCaixaOpen(true)}>
                <Unlock className="h-4 w-4 mr-2" />
                Abrir Caixa
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="contas">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="contas">
                <Receipt className="h-4 w-4 mr-2" />
                Contas Abertas ({contasAbertas.length})
              </TabsTrigger>
              <TabsTrigger value="resumo">
                <TrendingUp className="h-4 w-4 mr-2" />
                Resumo do Dia
              </TabsTrigger>
            </TabsList>

            <TabsContent value="contas" className="space-y-4">
              {contasAbertas.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Nenhuma conta aberta
                  </CardContent>
                </Card>
              ) : (
                contasAbertas.map((conta) => (
                  <Card key={conta.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-lg">
                              {conta.mesa_numero ? `Mesa ${conta.mesa_numero}` : 'Avulso'}
                            </span>
                            {conta.nome_cliente && (
                              <Badge variant="outline">{conta.nome_cliente}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Aberta em {new Date(conta.aberta_em).toLocaleTimeString()}
                          </p>
                          <div className="flex gap-4 mt-2 text-sm">
                            <span>Subtotal: R$ {conta.valor_total.toFixed(2)}</span>
                            {conta.valor_desconto > 0 && (
                              <span className="text-green-600">
                                Desconto: R$ {conta.valor_desconto.toFixed(2)}
                              </span>
                            )}
                            <span className="text-muted-foreground">
                              Taxa ({conta.taxa_servico_percentual}%): R$ {conta.valor_taxa_servico.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">R$ {conta.valor_final.toFixed(2)}</p>
                          <Button 
                            size="sm" 
                            className="mt-2"
                            onClick={() => iniciarFechamento(conta)}
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Fechar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="resumo" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Dinheiro</p>
                    <p className="text-xl font-bold">R$ {caixa.total_vendas_dinheiro.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Cartão Crédito</p>
                    <p className="text-xl font-bold">R$ {caixa.total_vendas_cartao_credito.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Cartão Débito</p>
                    <p className="text-xl font-bold">R$ {caixa.total_vendas_cartao_debito.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">PIX</p>
                    <p className="text-xl font-bold">R$ {caixa.total_vendas_pix.toFixed(2)}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Resumo Financeiro</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Fundo de Caixa</span>
                    <span>R$ {caixa.fundo_de_caixa.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Vendas</span>
                    <span className="text-green-600">+ R$ {totalVendas.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Descontos</span>
                    <span className="text-red-600">- R$ {caixa.total_descontos.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxa de Serviço</span>
                    <span className="text-blue-600">+ R$ {caixa.total_taxa_servico.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Gastos</span>
                    <span className="text-red-600">- R$ {caixa.total_gastos.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>Total em Caixa</span>
                    <span>R$ {(caixa.fundo_de_caixa + totalVendas - caixa.total_gastos).toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* Dialog Abrir Caixa */}
      <Dialog open={abrirCaixaOpen} onOpenChange={setAbrirCaixaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir Caixa</DialogTitle>
            <DialogDescription>
              Informe o valor do fundo de caixa inicial
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fundo">Fundo de Caixa (R$)</Label>
              <Input
                id="fundo"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={fundoCaixa}
                onChange={(e) => setFundoCaixa(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbrirCaixaOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={abrirCaixa} disabled={isLoading}>
              {isLoading ? 'Abrindo...' : 'Abrir Caixa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Fechar Conta */}
      <Dialog open={fecharContaOpen} onOpenChange={setFecharContaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Fechar Conta</DialogTitle>
            <DialogDescription>
              {contaSelecionada && (
                <>
                  Valor final: <strong>R$ {contaSelecionada.valor_final.toFixed(2)}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Formas de Pagamento</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="w-32">Dinheiro:</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={pagamentos.dinheiro || ''}
                    onChange={(e) => setPagamentos(p => ({ ...p, dinheiro: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="w-32">Cartão Crédito:</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={pagamentos.cartao_credito || ''}
                    onChange={(e) => setPagamentos(p => ({ ...p, cartao_credito: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="w-32">Cartão Débito:</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={pagamentos.cartao_debito || ''}
                    onChange={(e) => setPagamentos(p => ({ ...p, cartao_debito: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="w-32">PIX:</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={pagamentos.pix || ''}
                    onChange={(e) => setPagamentos(p => ({ ...p, pix: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between font-medium">
                <span>Total Pago:</span>
                <span>R$ {Object.values(pagamentos).reduce((a, b) => a + b, 0).toFixed(2)}</span>
              </div>
              {contaSelecionada && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Restante:</span>
                  <span className={Object.values(pagamentos).reduce((a, b) => a + b, 0) === contaSelecionada.valor_final ? 'text-green-600' : 'text-red-600'}>
                    R$ {(contaSelecionada.valor_final - Object.values(pagamentos).reduce((a, b) => a + b, 0)).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFecharContaOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={fecharConta} disabled={isLoading}>
              {isLoading ? 'Fechando...' : 'Confirmar Fechamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
