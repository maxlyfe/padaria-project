import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  ShoppingCart,
  Table2,
  User,
  Trash2,
  Send,
  ChefHat
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Produto {
  id: string;
  nome: string;
  valor: number;
  foto_url: string | null;
  feito_pela_cozinha: boolean;
  categoria: string | null;
}

interface Mesa {
  id: string;
  numero: number;
  nome: string | null;
  status: 'livre' | 'ocupada' | 'fechada';
}

interface Conta {
  id: string;
  mesa_id: string | null;
  nome_cliente: string | null;
  tipo: 'mesa' | 'avulso';
  status: 'aberta' | 'fechada' | 'cancelada';
  valor_total: number;
}

interface ItemConta {
  id: string;
  produto_id: string | null;
  combo_id: string | null;
  tipo: 'produto' | 'combo';
  nome: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  observacoes: string | null;
  status: string;
  enviado_para_cozinha: boolean;
  cancelado: boolean;
}

export function PDV() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('mesas');
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [contaAtual, setContaAtual] = useState<Conta | null>(null);
  const [itensConta, setItensConta] = useState<ItemConta[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Buscar mesas e produtos
  useEffect(() => {
    fetchMesas();
    fetchProdutos();
  }, []);

  const fetchMesas = async () => {
    const { data, error } = await supabase
      .from('mesas')
      .select('*')
      .order('numero');
    
    if (error) {
      toast.error('Erro ao carregar mesas');
      return;
    }
    
    setMesas(data || []);
  };

  const fetchProdutos = async () => {
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('ativo', true)
      .order('nome');
    
    if (error) {
      toast.error('Erro ao carregar produtos');
      return;
    }
    
    setProdutos(data || []);
  };

  const abrirContaMesa = async (mesa: Mesa) => {
    if (mesa.status === 'ocupada') {
      // Buscar conta aberta da mesa
      const { data: conta } = await supabase
        .from('contas')
        .select('*')
        .eq('mesa_id', mesa.id)
        .eq('status', 'aberta')
        .single();
      
      if (conta) {
        setContaAtual(conta);
        fetchItensConta(conta.id);
        setActiveTab('pedido');
      }
      return;
    }

    setIsLoading(true);
    
    // Criar nova conta
    const { data: conta, error } = await supabase
      .from('contas')
      .insert({
        mesa_id: mesa.id,
        tipo: 'mesa',
        aberta_por: profile?.id,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao abrir conta');
      setIsLoading(false);
      return;
    }

    // Atualizar status da mesa
    await supabase
      .from('mesas')
      .update({ status: 'ocupada', conta_atual_id: conta.id })
      .eq('id', mesa.id);

    setContaAtual(conta);
    setItensConta([]);
    fetchMesas();
    setActiveTab('pedido');
    setIsLoading(false);
    toast.success(`Conta aberta na ${mesa.nome || `Mesa ${mesa.numero}`}`);
  };

  const abrirContaAvulsa = async () => {
    if (!nomeCliente.trim()) {
      toast.error('Informe o nome do cliente');
      return;
    }

    setIsLoading(true);
    
    const { data: conta, error } = await supabase
      .from('contas')
      .insert({
        nome_cliente: nomeCliente,
        tipo: 'avulso',
        aberta_por: profile?.id,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar conta');
      setIsLoading(false);
      return;
    }

    setContaAtual(conta);
    setItensConta([]);
    setActiveTab('pedido');
    setIsLoading(false);
    toast.success('Conta avulsa criada');
  };

  const fetchItensConta = async (contaId: string) => {
    const { data, error } = await supabase
      .from('conta_itens')
      .select('*')
      .eq('conta_id', contaId)
      .eq('cancelado', false)
      .order('created_at', { ascending: false });
    
    if (!error) {
      setItensConta(data || []);
    }
  };

  const adicionarItem = async (produto: Produto) => {
    if (!contaAtual) return;

    const { error } = await supabase
      .from('conta_itens')
      .insert({
        conta_id: contaAtual.id,
        produto_id: produto.id,
        tipo: 'produto',
        nome: produto.nome,
        quantidade: 1,
        valor_unitario: produto.valor,
        valor_total: produto.valor,
        status: 'pendente',
      });

    if (error) {
      toast.error('Erro ao adicionar item');
      return;
    }

    fetchItensConta(contaAtual.id);
    toast.success(`${produto.nome} adicionado`);
  };

  const enviarParaCozinha = async () => {
    if (!contaAtual) return;

    const itensPendentes = itensConta.filter(i => i.status === 'pendente');
    
    if (itensPendentes.length === 0) {
      toast.info('Nenhum item pendente');
      return;
    }

    const { error } = await supabase
      .from('conta_itens')
      .update({
        enviado_para_cozinha: true,
        enviado_em: new Date().toISOString(),
        status: 'em_producao',
      })
      .eq('conta_id', contaAtual.id)
      .eq('status', 'pendente');

    if (error) {
      toast.error('Erro ao enviar para cozinha');
      return;
    }

    fetchItensConta(contaAtual.id);
    toast.success('Pedido enviado para cozinha!');
  };

  const removerItem = async (itemId: string) => {
    const item = itensConta.find(i => i.id === itemId);
    
    if (item?.status !== 'pendente') {
      toast.error('Apenas itens pendentes podem ser removidos');
      return;
    }

    const { error } = await supabase
      .from('conta_itens')
      .update({
        cancelado: true,
        cancelado_por: profile?.id,
        cancelado_em: new Date().toISOString(),
      })
      .eq('id', itemId);

    if (error) {
      toast.error('Erro ao remover item');
      return;
    }

    if (contaAtual) {
      fetchItensConta(contaAtual.id);
    }
    toast.success('Item removido');
  };

  const produtosFiltrados = produtos.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const valorTotal = itensConta
    .filter(i => !i.cancelado)
    .reduce((sum, item) => sum + item.valor_total, 0);

  const itensPendentes = itensConta.filter(i => i.status === 'pendente').length;
  const itensNaCozinha = itensConta.filter(i => i.status === 'em_producao').length;

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
              <div>
                <h1 className="text-xl font-bold">PDV</h1>
                <p className="text-sm text-muted-foreground">
                  {contaAtual ? 
                    `Conta: ${contaAtual.nome_cliente || `Mesa ${mesas.find(m => m.id === contaAtual.mesa_id)?.numero}`}` 
                    : 'Selecione uma mesa ou conta avulsa'}
                </p>
              </div>
            </div>
            {contaAtual && (
              <div className="flex items-center gap-4">
                <Badge variant="outline">
                  Pendentes: {itensPendentes}
                </Badge>
                <Badge variant="secondary">
                  <ChefHat className="h-3 w-3 mr-1" />
                  Cozinha: {itensNaCozinha}
                </Badge>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-xl font-bold">R$ {valorTotal.toFixed(2)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="mesas">
              <Table2 className="h-4 w-4 mr-2" />
              Mesas
            </TabsTrigger>
            <TabsTrigger value="pedido" disabled={!contaAtual}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Pedido
            </TabsTrigger>
          </TabsList>

          {/* Aba Mesas */}
          <TabsContent value="mesas" className="space-y-4">
            {/* Conta Avulsa */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Conta Avulsa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nome do cliente"
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.target.value)}
                  />
                  <Button onClick={abrirContaAvulsa} disabled={isLoading}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Grid de Mesas */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {mesas.map((mesa) => (
                <Card
                  key={mesa.id}
                  className={`cursor-pointer transition-all ${
                    mesa.status === 'ocupada' 
                      ? 'bg-orange-100 dark:bg-orange-900/20 border-orange-300' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => abrirContaMesa(mesa)}
                >
                  <CardContent className="p-4 text-center">
                    <Table2 className={`h-8 w-8 mx-auto mb-2 ${
                      mesa.status === 'ocupada' ? 'text-orange-500' : 'text-green-500'
                    }`} />
                    <p className="font-medium">{mesa.nome || `Mesa ${mesa.numero}`}</p>
                    <Badge 
                      variant={mesa.status === 'ocupada' ? 'default' : 'secondary'}
                      className="mt-2"
                    >
                      {mesa.status === 'ocupada' ? 'Ocupada' : 'Livre'}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Aba Pedido */}
          <TabsContent value="pedido" className="space-y-4">
            {contaAtual && (
              <>
                {/* Busca e Lista de Produtos */}
                <Card>
                  <CardHeader>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar produto..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-64 overflow-y-auto">
                      {produtosFiltrados.map((produto) => (
                        <Button
                          key={produto.id}
                          variant="outline"
                          className="h-auto py-3 flex flex-col items-start text-left"
                          onClick={() => adicionarItem(produto)}
                        >
                          <span className="font-medium truncate w-full">{produto.nome}</span>
                          <span className="text-sm text-muted-foreground">
                            R$ {produto.valor.toFixed(2)}
                          </span>
                          {produto.feito_pela_cozinha && (
                            <ChefHat className="h-3 w-3 text-orange-500 mt-1" />
                          )}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Itens da Conta */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Itens da Conta</CardTitle>
                    {itensPendentes > 0 && (
                      <Button onClick={enviarParaCozinha} size="sm">
                        <Send className="h-4 w-4 mr-2" />
                        Enviar Cozinha ({itensPendentes})
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {itensConta.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum item adicionado
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {itensConta.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-3 bg-muted rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{item.nome}</span>
                                <Badge variant={
                                  item.status === 'entregue' ? 'default' :
                                  item.status === 'em_producao' ? 'secondary' :
                                  item.status === 'pronto' ? 'outline' :
                                  'outline'
                                }>
                                  {item.status === 'pendente' && 'Pendente'}
                                  {item.status === 'em_producao' && 'Cozinha'}
                                  {item.status === 'pronto' && 'Pronto'}
                                  {item.status === 'entregue' && 'Entregue'}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {item.quantidade}x R$ {item.valor_unitario.toFixed(2)} = R$ {item.valor_total.toFixed(2)}
                              </p>
                              {item.observacoes && (
                                <p className="text-sm text-orange-600">Obs: {item.observacoes}</p>
                              )}
                            </div>
                            {item.status === 'pendente' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removerItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
