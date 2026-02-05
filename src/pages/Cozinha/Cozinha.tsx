import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  RefreshCw,
  ChefHat,
  MessageSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Pedido {
  id: string;
  conta_id: string;
  nome: string;
  quantidade: number;
  observacoes: string | null;
  status: string;
  enviado_em: string;
  tempo_espera: number;
  mesa_numero?: number;
  mesa_nome?: string;
  nome_cliente?: string;
}

export function Cozinha() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchPedidos = useCallback(async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('conta_itens')
      .select(`
        *,
        contas!inner(
          mesa_id,
          nome_cliente,
          mesas:numero
        )
      `)
      .eq('enviado_para_cozinha', true)
      .in('status', ['em_producao', 'pronto'])
      .eq('cancelado', false)
      .order('enviado_em', { ascending: true });

    if (error) {
      console.error('Erro ao buscar pedidos:', error);
      setIsLoading(false);
      return;
    }

    // Processar dados
    const pedidosProcessados: Pedido[] = (data || []).map((item: any) => ({
      id: item.id,
      conta_id: item.conta_id,
      nome: item.nome,
      quantidade: item.quantidade,
      observacoes: item.observacoes,
      status: item.status,
      enviado_em: item.enviado_em,
      tempo_espera: Math.floor((Date.now() - new Date(item.enviado_em).getTime()) / 1000),
      mesa_numero: item.contas?.mesas?.numero,
      nome_cliente: item.contas?.nome_cliente,
    }));

    setPedidos(pedidosProcessados);
    setIsLoading(false);
  }, []);

  // Buscar pedidos inicialmente
  useEffect(() => {
    fetchPedidos();
  }, [fetchPedidos]);

  // Auto-refresh a cada 10 segundos
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchPedidos, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchPedidos]);

  // Atualizar tempo de espera a cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setPedidos(prev => prev.map(p => ({
        ...p,
        tempo_espera: p.tempo_espera + 1
      })));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const marcarComoPronto = async (pedidoId: string) => {
    const { error } = await supabase
      .from('conta_itens')
      .update({ status: 'pronto' })
      .eq('id', pedidoId);

    if (error) {
      toast.error('Erro ao atualizar pedido');
      return;
    }

    fetchPedidos();
    toast.success('Pedido marcado como pronto!');
  };

  const marcarComoEntregue = async (pedidoId: string) => {
    const { error } = await supabase
      .from('conta_itens')
      .update({ 
        status: 'entregue',
        entregue_em: new Date().toISOString()
      })
      .eq('id', pedidoId);

    if (error) {
      toast.error('Erro ao marcar como entregue');
      return;
    }

    fetchPedidos();
    toast.success('Pedido entregue!');
  };

  const solicitarInformacao = (pedido: Pedido) => {
    toast.info(`Solicitar informação sobre: ${pedido.nome}`, {
      description: `Mesa ${pedido.mesa_numero || 'Avulsa'} - ${pedido.nome_cliente || 'Cliente'}`,
    });
  };

  const formatarTempo = (segundos: number) => {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const pedidosEmProducao = pedidos.filter(p => p.status === 'em_producao');
  const pedidosProntos = pedidos.filter(p => p.status === 'pronto');

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
                <div className="h-10 w-10 bg-orange-500 rounded-full flex items-center justify-center">
                  <ChefHat className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Cozinha</h1>
                  <p className="text-sm text-muted-foreground">
                    {pedidosEmProducao.length} em produção • {pedidosProntos.length} prontos
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={autoRefresh ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto
              </Button>
              <Button variant="outline" size="icon" onClick={fetchPedidos} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Pedidos em Produção */}
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Em Produção ({pedidosEmProducao.length})
            </h2>
            <div className="space-y-3">
              {pedidosEmProducao.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Nenhum pedido em produção
                  </CardContent>
                </Card>
              ) : (
                pedidosEmProducao.map((pedido) => (
                  <Card key={pedido.id} className="border-orange-300 bg-orange-50 dark:bg-orange-900/10">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl font-bold">{pedido.quantidade}x</span>
                            <span className="text-lg font-medium">{pedido.nome}</span>
                          </div>
                          <Badge variant="outline" className="mb-2">
                            {pedido.mesa_numero ? `Mesa ${pedido.mesa_numero}` : 'Avulso'}
                            {pedido.nome_cliente && ` - ${pedido.nome_cliente}`}
                          </Badge>
                          {pedido.observacoes && (
                            <div className="flex items-start gap-2 text-sm text-orange-700 dark:text-orange-300 mt-2 p-2 bg-orange-100 dark:bg-orange-900/30 rounded">
                              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span>{pedido.observacoes}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span className={`font-mono ${pedido.tempo_espera > 600 ? 'text-red-500 font-bold' : ''}`}>
                              {formatarTempo(pedido.tempo_espera)}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => marcarComoPronto(pedido.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Pronto
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => solicitarInformacao(pedido)}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Info
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Pedidos Prontos */}
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Prontos para Entrega ({pedidosProntos.length})
            </h2>
            <div className="space-y-3">
              {pedidosProntos.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Nenhum pedido pronto
                  </CardContent>
                </Card>
              ) : (
                pedidosProntos.map((pedido) => (
                  <Card key={pedido.id} className="border-green-300 bg-green-50 dark:bg-green-900/10">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl font-bold">{pedido.quantidade}x</span>
                            <span className="text-lg font-medium">{pedido.nome}</span>
                          </div>
                          <Badge variant="outline" className="mb-2">
                            {pedido.mesa_numero ? `Mesa ${pedido.mesa_numero}` : 'Avulso'}
                            {pedido.nome_cliente && ` - ${pedido.nome_cliente}`}
                          </Badge>
                          {pedido.observacoes && (
                            <div className="flex items-start gap-2 text-sm text-green-700 dark:text-green-300 mt-2 p-2 bg-green-100 dark:bg-green-900/30 rounded">
                              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span>{pedido.observacoes}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span className="font-mono">
                              {formatarTempo(pedido.tempo_espera)}
                            </span>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => marcarComoEntregue(pedido.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Entregue
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
