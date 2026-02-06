import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  Trash2,
  ChefHat,
  Send,
  UserPlus,
  Users,
  Armchair,
  Settings,
  Pencil,
  X,
  ArrowLeft,
  Receipt,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

interface Mesa {
  id: string;
  numero: number;
  nome: string | null;
  status: 'livre' | 'ocupada';
  conta_atual_id: string | null;
}

interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  valor: number;
  feito_pela_cozinha: boolean;
  ativo: boolean;
}

interface ContaItem {
  id: string;
  produto_id: string;
  tipo: 'produto' | 'combo';
  nome: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  status: 'pendente' | 'em_producao' | 'pronto' | 'entregue';
  observacoes: string | null;
  enviado_para_cozinha: boolean;
  cancelado: boolean;
}

interface Conta {
  id: string;
  mesa_id: string | null;
  nome_cliente: string | null;
  tipo: 'mesa' | 'avulso';
  status: 'aberta' | 'fechada' | 'cancelada';
  aberta_por: string;
}

export function PDV() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [contaAtual, setContaAtual] = useState<Conta | null>(null);
  const [itensConta, setItensConta] = useState<ContaItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('mesas');

  // Estados para gerenciamento de mesas
  const [mesasDialogOpen, setMesasDialogOpen] = useState(false);
  const [deleteMesaDialogOpen, setDeleteMesaDialogOpen] = useState(false);
  const [mesaEditando, setMesaEditando] = useState<Mesa | null>(null);
  const [formMesa, setFormMesa] = useState({ numero: '', nome: '' });

  // Estados para cancelamento
  const [cancelarContaDialogOpen, setCancelarContaDialogOpen] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');

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
    setNomeCliente('');
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

  // ========== CANCELAR ITENS ==========
  const cancelarItem = async (itemId: string) => {
    const item = itensConta.find(i => i.id === itemId);

    // Só pode cancelar se ainda não foi para cozinha (pendente)
    if (item?.status !== 'pendente') {
      toast.error('Só é possível cancelar itens que ainda não foram enviados para a cozinha');
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
      toast.error('Erro ao cancelar item');
      return;
    }

    if (contaAtual) {
      fetchItensConta(contaAtual.id);
    }
    toast.success('Item cancelado');
  };

  // ========== VOLTAR E LIBERAR MESA SE VAZIA ==========
  const voltarParaMesas = async () => {
    // Se tem conta aberta mas não tem itens, cancelar a conta e liberar mesa
    if (contaAtual && itensConta.length === 0) {
      await cancelarContaVazia();
    }
    
    setContaAtual(null);
    setItensConta([]);
    setActiveTab('mesas');
    fetchMesas();
  };

  // ========== CANCELAR CONTA VAZIA (SEM ITENS) ==========
  const cancelarContaVazia = async () => {
    if (!contaAtual) return;

    // Cancelar a conta
    await supabase
      .from('contas')
      .update({ 
        status: 'cancelada',
        fechada_em: new Date().toISOString()
      })
      .eq('id', contaAtual.id);

    // Liberar a mesa se for mesa
    if (contaAtual.mesa_id) {
      await supabase
        .from('mesas')
        .update({ 
          status: 'livre', 
          conta_atual_id: null 
        })
        .eq('id', contaAtual.mesa_id);
    }
  };

  // ========== CANCELAR CONTA COMPLETA ==========
  const abrirCancelarConta = () => {
    if (!contaAtual) return;
    
    // Verificar se tem itens em produção
    const itensEmProducao = itensConta.filter(i => 
      i.status === 'em_producao' || i.status === 'pronto'
    );
    
    if (itensEmProducao.length > 0) {
      toast.error('Não é possível cancelar: existem itens em produção ou prontos na cozinha');
      return;
    }

    setCancelarContaDialogOpen(true);
  };

  const confirmarCancelarConta = async () => {
    if (!contaAtual) return;

    setIsLoading(true);

    try {
      // 1. Cancelar todos os itens pendentes
      await supabase
        .from('conta_itens')
        .update({
          cancelado: true,
          cancelado_por: profile?.id,
          cancelado_em: new Date().toISOString(),
        })
        .eq('conta_id', contaAtual.id)
        .eq('cancelado', false);

      // 2. Criar registro no caixa como "conta cancelada"
      await supabase
        .from('movimentacoes_caixa')
        .insert({
          tipo: 'saida',
          descricao: `Conta cancelada: ${contaAtual.nome_cliente || 'Mesa'} - Motivo: ${motivoCancelamento || 'Não informado'}`,
          valor: 0,
          categoria: 'cancelamento',
          registrado_por: profile?.id,
        });

      // 3. Atualizar conta para cancelada
      await supabase
        .from('contas')
        .update({ 
          status: 'cancelada',
          fechada_em: new Date().toISOString(),
          observacoes: `Cancelada: ${motivoCancelamento}`
        })
        .eq('id', contaAtual.id);

      // 4. Liberar mesa
      if (contaAtual.mesa_id) {
        await supabase
          .from('mesas')
          .update({ 
            status: 'livre', 
            conta_atual_id: null 
          })
          .eq('id', contaAtual.mesa_id);
      }

      toast.success('Conta cancelada e enviada ao caixa');
      setCancelarContaDialogOpen(false);
      setMotivoCancelamento('');
      voltarParaMesas();
    } catch (error: any) {
      toast.error('Erro ao cancelar conta: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ========== FECHAMENTO ==========
  const fecharConta = () => {
    if (!contaAtual) {
      toast.error('Nenhuma conta aberta');
      return;
    }
    
    if (itensConta.length === 0) {
      toast.error('Não há itens na conta');
      return;
    }

    // Navegar para o caixa com o ID da conta
    navigate(`/caixa?conta=${contaAtual.id}`);
  };

  // ========== GERENCIAMENTO DE MESAS ==========
  const abrirMesasDialog = (mesa?: Mesa) => {
    if (mesa) {
      setMesaEditando(mesa);
      setFormMesa({
        numero: mesa.numero.toString(),
        nome: mesa.nome || '',
      });
    } else {
      setMesaEditando(null);
      const proximoNumero = mesas.length > 0 
        ? Math.max(...mesas.map(m => m.numero)) + 1 
        : 1;
      setFormMesa({
        numero: proximoNumero.toString(),
        nome: '',
      });
    }
    setMesasDialogOpen(true);
  };

  const salvarMesa = async () => {
    const numero = parseInt(formMesa.numero);
    
    if (isNaN(numero) || numero <= 0) {
      toast.error('Número da mesa inválido');
      return;
    }

    if (!formMesa.nome.trim()) {
      toast.error('Nome da mesa é obrigatório');
      return;
    }

    setIsLoading(true);

    try {
      if (mesaEditando) {
        const { error } = await supabase
          .from('mesas')
          .update({
            numero: numero,
            nome: formMesa.nome.trim(),
          })
          .eq('id', mesaEditando.id);

        if (error) {
          if (error.message.includes('duplicate') || error.message.includes('unique')) {
            toast.error('Já existe uma mesa com este número');
          } else {
            toast.error('Erro ao atualizar mesa: ' + error.message);
          }
          return;
        }
        toast.success('Mesa atualizada!');
      } else {
        const { data, error } = await supabase
          .from('mesas')
          .insert({
            numero: numero,
            nome: formMesa.nome.trim(),
            status: 'livre',
          })
          .select();

        if (error) {
          if (error.message.includes('duplicate') || error.message.includes('unique')) {
            toast.error('Já existe uma mesa com este número');
          } else {
            toast.error('Erro ao criar mesa: ' + error.message);
          }
          return;
        }
        toast.success('Mesa criada!');
      }

      setMesasDialogOpen(false);
      setFormMesa({ numero: '', nome: '' });
      setMesaEditando(null);
      await fetchMesas();
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmarExclusaoMesa = (mesa: Mesa) => {
    if (mesa.status === 'ocupada') {
      toast.error('Não é possível excluir uma mesa ocupada');
      return;
    }
    setMesaEditando(mesa);
    setDeleteMesaDialogOpen(true);
  };

  const excluirMesa = async () => {
    if (!mesaEditando) return;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('mesas')
        .delete()
        .eq('id', mesaEditando.id);

      if (error) {
        toast.error('Erro ao excluir mesa: ' + error.message);
        return;
      }

      toast.success('Mesa excluída!');
      setDeleteMesaDialogOpen(false);
      setMesaEditando(null);
      await fetchMesas();
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const produtosFiltrados = produtos.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const valorTotal = itensConta
    .filter(i => !i.cancelado)
    .reduce((sum, item) => sum + item.valor_total, 0);

  const itensPendentes = itensConta.filter(i => i.status === 'pendente').length;
  const itensNaCozinha = itensConta.filter(i => i.status === 'em_producao').length;

  // Verificar se pode cancelar conta (só se não tem itens em produção)
  const podeCancelarConta = itensConta.every(i => i.status === 'pendente' || i.status === 'entregue');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  PDV - Ponto de Venda
                  {contaAtual && (
                    <Badge variant="outline" className="font-normal">
                      {contaAtual.tipo === 'mesa' ? 'Mesa' : 'Avulso'}
                    </Badge>
                  )}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {contaAtual 
                    ? contaAtual.nome_cliente || `Mesa ${mesas.find(m => m.id === contaAtual.mesa_id)?.numero}`
                    : 'Selecione uma mesa ou abra conta avulsa'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {contaAtual ? (
                <>
                  <Button variant="outline" onClick={voltarParaMesas}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                  {podeCancelarConta && (
                    <Button 
                      variant="destructive" 
                      onClick={abrirCancelarConta}
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Cancelar Conta
                    </Button>
                  )}
                  <Button variant="default" onClick={fecharConta}>
                    <Receipt className="h-4 w-4 mr-2" />
                    Fechar Conta R$ {valorTotal.toFixed(2)}
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => abrirMesasDialog()}>
                  <Settings className="h-4 w-4 mr-2" />
                  Gerenciar Mesas
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="mesas">Mesas</TabsTrigger>
            <TabsTrigger value="pedido" disabled={!contaAtual}>Pedido</TabsTrigger>
          </TabsList>

          {/* Aba Mesas */}
          <TabsContent value="mesas" className="space-y-6">
            {/* Conta Avulsa */}
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <UserPlus className="h-5 w-5" />
                  Conta Avulsa / Balcão / Delivery
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    placeholder="Nome do cliente..."
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && abrirContaAvulsa()}
                  />
                  <Button 
                    onClick={abrirContaAvulsa} 
                    disabled={isLoading || !nomeCliente.trim()}
                    className="bg-primary"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Abrir Conta Avulsa
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Grid de Mesas */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Mesas do Salão
                  <Badge variant="secondary">
                    {mesas.filter(m => m.status === 'livre').length} livres
                  </Badge>
                </h2>
                <Button variant="ghost" size="sm" onClick={() => abrirMesasDialog()}>
                  <Settings className="h-4 w-4 mr-1" />
                  Gerenciar
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {mesas.map((mesa) => (
                  <Card
                    key={mesa.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      mesa.status === 'ocupada'
                        ? 'bg-orange-100 dark:bg-orange-950/30 border-orange-300'
                        : 'hover:border-primary'
                    }`}
                    onClick={() => abrirContaMesa(mesa)}
                  >
                    <CardContent className="p-4 text-center">
                      <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 ${
                        mesa.status === 'ocupada'
                          ? 'bg-orange-500 text-white'
                          : 'bg-green-100 text-green-600 dark:bg-green-900/30'
                      }`}>
                        <Armchair className="h-6 w-6" />
                      </div>
                      <p className="font-medium text-sm">
                        {mesa.nome || `Mesa ${mesa.numero}`}
                      </p>
                      <Badge 
                        variant={mesa.status === 'ocupada' ? 'destructive' : 'default'}
                        className="mt-1 text-xs"
                      >
                        {mesa.status === 'ocupada' ? 'Ocupada' : 'Livre'}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Aba Pedido */}
          <TabsContent value="pedido" className="space-y-4">
            {contaAtual && (
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Lista de Produtos */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Search className="h-4 w-4" />
                        Produtos
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Input
                        placeholder="Buscar produto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                        {produtosFiltrados.map((produto) => (
                          <Button
                            key={produto.id}
                            variant="outline"
                            className="h-auto py-3 justify-between text-left"
                            onClick={() => adicionarItem(produto)}
                          >
                            <div>
                              <p className="font-medium">{produto.nome}</p>
                              {produto.feito_pela_cozinha && (
                                <p className="text-xs text-orange-500 flex items-center gap-1">
                                  <ChefHat className="h-3 w-3" />
                                  Cozinha
                                </p>
                              )}
                            </div>
                            <span className="font-mono">
                              R$ {produto.valor.toFixed(2)}
                            </span>
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Itens da Conta */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Itens da Conta</CardTitle>
                        <div className="flex gap-2">
                          {itensPendentes > 0 && (
                            <Badge variant="secondary">
                              {itensPendentes} pendentes
                            </Badge>
                          )}
                          {itensNaCozinha > 0 && (
                            <Badge className="bg-orange-500">
                              {itensNaCozinha} na cozinha
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {itensConta.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          Nenhum item adicionado
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {itensConta.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-3 rounded-lg border"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{item.nome}</span>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${
                                      item.status === 'pendente' ? 'text-yellow-600' :
                                      item.status === 'em_producao' ? 'text-orange-600' :
                                      item.status === 'pronto' ? 'text-blue-600' :
                                      'text-green-600'
                                    }`}
                                  >
                                    {item.status === 'pendente' && 'Pendente'}
                                    {item.status === 'em_producao' && 'Cozinha'}
                                    {item.status === 'pronto' && 'Pronto'}
                                    {item.status === 'entregue' && 'Entregue'}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {item.quantidade}x R$ {item.valor_unitario.toFixed(2)} = R$ {item.valor_total.toFixed(2)}
                                </p>
                              </div>
                              {/* Só mostra botão cancelar se estiver pendente */}
                              {item.status === 'pendente' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive"
                                  onClick={() => cancelarItem(item.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Cancelar
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Total e Ações */}
                      <div className="border-t pt-4 space-y-3">
                        <div className="flex items-center justify-between text-lg font-bold">
                          <span>Total</span>
                          <span>R$ {valorTotal.toFixed(2)}</span>
                        </div>
                        
                        {itensPendentes > 0 && (
                          <Button 
                            className="w-full bg-orange-500 hover:bg-orange-600"
                            onClick={enviarParaCozinha}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Enviar {itensPendentes} item(s) para Cozinha
                          </Button>
                        )}

                        <Button 
                          className="w-full" 
                          size="lg"
                          onClick={fecharConta}
                        >
                          <Receipt className="h-4 w-4 mr-2" />
                          Fechar Conta - R$ {valorTotal.toFixed(2)}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* ========== MODAIS ========== */}

      {/* Modal Gerenciar Mesas */}
      <Dialog open={mesasDialogOpen} onOpenChange={setMesasDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {mesaEditando ? 'Editar Mesa' : 'Gerenciar Mesas'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div className="space-y-2">
                <Label>Número *</Label>
                <Input
                  type="number"
                  value={formMesa.numero}
                  onChange={(e) => setFormMesa(d => ({ ...d, numero: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={formMesa.nome}
                  onChange={(e) => setFormMesa(d => ({ ...d, nome: e.target.value }))}
                />
              </div>
              <div className="col-span-2">
                <Button onClick={salvarMesa} disabled={isLoading} className="w-full">
                  {isLoading ? 'Salvando...' : (mesaEditando ? 'Atualizar' : 'Criar')}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Mesas Existentes ({mesas.length})</Label>
              <div className="max-h-[200px] overflow-y-auto space-y-1 border rounded-md p-2">
                {mesas.sort((a, b) => a.numero - b.numero).map((mesa) => (
                  <div 
                    key={mesa.id} 
                    className="flex items-center justify-between p-2 hover:bg-muted rounded"
                  >
                    <span className="text-sm">{mesa.nome || `Mesa ${mesa.numero}`}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => abrirMesasDialog(mesa)}
                        disabled={mesa.status === 'ocupada'}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => confirmarExclusaoMesa(mesa)}
                        disabled={mesa.status === 'ocupada'}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Excluir Mesa */}
      <AlertDialog open={deleteMesaDialogOpen} onOpenChange={setDeleteMesaDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Mesa?</AlertDialogTitle>
            <AlertDialogDescription>
              A mesa "{mesaEditando?.nome || `Mesa ${mesaEditando?.numero}`}" será excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={excluirMesa}
              className="bg-destructive text-destructive-foreground"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Cancelar Conta */}
      <Dialog open={cancelarContaDialogOpen} onOpenChange={setCancelarContaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Cancelar Conta Completa
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Esta ação cancelará todos os itens da conta e enviará um registro ao caixa.
              Só é possível cancelar contas que não tenham itens em produção.
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo do Cancelamento</Label>
              <Input
                id="motivo"
                placeholder="Ex: Cliente desistiu, erro no pedido..."
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
              />
            </div>

            <div className="bg-muted p-3 rounded text-sm">
              <p><strong>Itens a serem cancelados:</strong></p>
              <ul className="mt-1 space-y-1">
                {itensConta.map(item => (
                  <li key={item.id}>
                    {item.quantidade}x {item.nome} - R$ {item.valor_total.toFixed(2)}
                  </li>
                ))}
              </ul>
              <p className="mt-2 font-bold">
                Total: R$ {valorTotal.toFixed(2)}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelarContaDialogOpen(false)}>
              Voltar
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmarCancelarConta}
              disabled={isLoading}
            >
              {isLoading ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}