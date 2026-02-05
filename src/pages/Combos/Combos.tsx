import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/services/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  Upload,
  ChefHat,
  Image as ImageIcon,
  Minus,
  Plus as PlusIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
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

interface Produto {
  id: string;
  nome: string;
  valor: number;
  feito_pela_cozinha: boolean;
}

interface ComboProduto {
  produto_id: string;
  quantidade: number;
  produto: Produto;
}

interface Combo {
  id: string;
  nome: string;
  descricao: string | null;
  foto_url: string | null;
  valor_total_produtos: number;
  valor_venda: number;
  feito_pela_cozinha: boolean;
  ativo: boolean;
  produtos?: ComboProduto[];
}

export function Combos() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [combos, setCombos] = useState<Combo[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [comboSelecionado, setComboSelecionado] = useState<Combo | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    valor_venda: '',
    feito_pela_cozinha: false,
    ativo: true,
  });
  const [produtosSelecionados, setProdutosSelecionados] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchCombos();
    fetchProdutos();
  }, []);

  const fetchCombos = async () => {
    const { data: combosData, error: combosError } = await supabase
      .from('combos')
      .select('*')
      .order('nome');

    if (combosError) {
      toast.error('Erro ao carregar combos');
      return;
    }

    // Buscar produtos de cada combo
    const combosComProdutos = await Promise.all(
      (combosData || []).map(async (combo) => {
        const { data: produtosCombo } = await supabase
          .from('combo_produtos')
          .select(`
            produto_id,
            quantidade,
            produto:produtos(*)
          `)
          .eq('combo_id', combo.id);

        return {
          ...combo,
          produtos: produtosCombo || [],
        };
      })
    );

    setCombos(combosComProdutos);
  };

  const fetchProdutos = async () => {
    const { data, error } = await supabase
      .from('produtos')
      .select('id, nome, valor, feito_pela_cozinha')
      .eq('ativo', true)
      .order('nome');

    if (error) {
      toast.error('Erro ao carregar produtos');
      return;
    }

    setProdutos(data || []);
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setPreviewImage(reader.result as string);
    reader.readAsDataURL(file);

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('combos')
      .upload(fileName, file);

    if (uploadError) {
      toast.error('Erro ao fazer upload da imagem');
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('combos')
      .getPublicUrl(fileName);

    setPreviewImage(publicUrl);
    return publicUrl;
  };

  const calcularValorTotalProdutos = () => {
    return Object.entries(produtosSelecionados)
      .filter(([, qtd]) => qtd > 0)
      .reduce((total, [produtoId, qtd]) => {
        const produto = produtos.find(p => p.id === produtoId);
        return total + (produto?.valor || 0) * qtd;
      }, 0);
  };

  const abrirDialog = (combo?: Combo) => {
    if (combo) {
      setComboSelecionado(combo);
      setFormData({
        nome: combo.nome,
        descricao: combo.descricao || '',
        valor_venda: combo.valor_venda.toString(),
        feito_pela_cozinha: combo.feito_pela_cozinha,
        ativo: combo.ativo,
      });
      setPreviewImage(combo.foto_url);
      
      // Carregar produtos do combo
      const produtosMap: Record<string, number> = {};
      combo.produtos?.forEach((cp: any) => {
        produtosMap[cp.produto_id] = cp.quantidade;
      });
      setProdutosSelecionados(produtosMap);
    } else {
      setComboSelecionado(null);
      setFormData({
        nome: '',
        descricao: '',
        valor_venda: '',
        feito_pela_cozinha: false,
        ativo: true,
      });
      setPreviewImage(null);
      setProdutosSelecionados({});
    }
    setDialogOpen(true);
  };

  const salvarCombo = async () => {
    if (!formData.nome.trim()) {
      toast.error('Nome do combo é obrigatório');
      return;
    }

    const valorVenda = parseFloat(formData.valor_venda);
    if (isNaN(valorVenda) || valorVenda < 0) {
      toast.error('Valor de venda inválido');
      return;
    }

    const produtosDoCombo = Object.entries(produtosSelecionados)
      .filter(([, qtd]) => qtd > 0);

    if (produtosDoCombo.length === 0) {
      toast.error('Selecione pelo menos um produto');
      return;
    }

    const valorTotalProdutos = calcularValorTotalProdutos();

    setIsLoading(true);

    const dadosCombo = {
      nome: formData.nome,
      descricao: formData.descricao || null,
      foto_url: previewImage,
      valor_total_produtos: valorTotalProdutos,
      valor_venda: valorVenda,
      feito_pela_cozinha: formData.feito_pela_cozinha,
      ativo: formData.ativo,
    };

    let comboId: string;

    if (comboSelecionado) {
      // Atualizar combo
      const { error } = await supabase
        .from('combos')
        .update(dadosCombo)
        .eq('id', comboSelecionado.id);

      if (error) {
        toast.error('Erro ao atualizar combo');
        setIsLoading(false);
        return;
      }
      comboId = comboSelecionado.id;

      // Remover produtos antigos
      await supabase
        .from('combo_produtos')
        .delete()
        .eq('combo_id', comboId);
    } else {
      // Criar combo
      const { data, error } = await supabase
        .from('combos')
        .insert(dadosCombo)
        .select()
        .single();

      if (error || !data) {
        toast.error('Erro ao criar combo');
        setIsLoading(false);
        return;
      }
      comboId = data.id;
    }

    // Inserir produtos do combo
    const produtosInsert = produtosDoCombo.map(([produtoId, quantidade]) => ({
      combo_id: comboId,
      produto_id: produtoId,
      quantidade,
    }));

    const { error: prodError } = await supabase
      .from('combo_produtos')
      .insert(produtosInsert);

    if (prodError) {
      toast.error('Erro ao associar produtos');
      setIsLoading(false);
      return;
    }

    setDialogOpen(false);
    fetchCombos();
    setIsLoading(false);
    toast.success(comboSelecionado ? 'Combo atualizado!' : 'Combo criado!');
  };

  const confirmarExclusao = (combo: Combo) => {
    setComboSelecionado(combo);
    setDeleteDialogOpen(true);
  };

  const excluirCombo = async () => {
    if (!comboSelecionado) return;

    setIsLoading(true);

    const { error } = await supabase
      .from('combos')
      .update({ ativo: false })
      .eq('id', comboSelecionado.id);

    if (error) {
      toast.error('Erro ao desativar combo');
      setIsLoading(false);
      return;
    }

    setDeleteDialogOpen(false);
    fetchCombos();
    setIsLoading(false);
    toast.success('Combo desativado!');
  };

  const alterarQuantidade = (produtoId: string, delta: number) => {
    setProdutosSelecionados(prev => {
      const atual = prev[produtoId] || 0;
      const novo = Math.max(0, atual + delta);
      return { ...prev, [produtoId]: novo };
    });
  };

  const combosFiltrados = combos.filter(c =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const valorTotalProdutos = calcularValorTotalProdutos();
  const desconto = valorTotalProdutos - parseFloat(formData.valor_venda || '0');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Combos</h1>
                <p className="text-sm text-muted-foreground">
                  {combos.filter(c => c.ativo).length} ativos
                </p>
              </div>
            </div>
            <Button onClick={() => abrirDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Combo
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar combo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Combos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {combosFiltrados.map((combo) => (
            <Card key={combo.id} className={!combo.ativo ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="h-20 w-20 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {combo.foto_url ? (
                      <img 
                        src={combo.foto_url} 
                        alt={combo.nome}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{combo.nome}</h3>
                    <p className="text-lg font-bold text-primary">
                      R$ {combo.valor_venda.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="line-through">R$ {combo.valor_total_produtos.toFixed(2)}</span>
                      {' '}
                      <span className="text-green-600">
                        Economia: R$ {(combo.valor_total_produtos - combo.valor_venda).toFixed(2)}
                      </span>
                    </p>
                    {combo.feito_pela_cozinha && (
                      <ChefHat className="h-4 w-4 text-orange-500 mt-1" />
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => abrirDialog(combo)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => confirmarExclusao(combo)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {combosFiltrados.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum combo encontrado
          </div>
        )}
      </main>

      {/* Dialog Criar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {comboSelecionado ? 'Editar Combo' : 'Novo Combo'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Imagem */}
            <div className="flex justify-center">
              <div 
                className="h-32 w-32 bg-muted rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors overflow-hidden border-2 border-dashed border-muted-foreground/25"
                onClick={() => fileInputRef.current?.click()}
              >
                {previewImage ? (
                  <img 
                    src={previewImage} 
                    alt="Preview" 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="text-center p-4">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Adicionar foto</span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData(d => ({ ...d, nome: e.target.value }))}
                placeholder="Nome do combo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData(d => ({ ...d, descricao: e.target.value }))}
                placeholder="Descrição do combo"
              />
            </div>

            {/* Produtos do Combo */}
            <div className="space-y-2">
              <Label>Produtos do Combo</Label>
              <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                {produtos.map((produto) => (
                  <div key={produto.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{produto.nome}</span>
                      <span className="text-sm text-muted-foreground">
                        R$ {produto.valor.toFixed(2)}
                      </span>
                      {produto.feito_pela_cozinha && (
                        <ChefHat className="h-3 w-3 text-orange-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => alterarQuantidade(produto.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center">
                        {produtosSelecionados[produto.id] || 0}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => alterarQuantidade(produto.id, 1)}
                      >
                        <PlusIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Valores */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor dos Produtos</Label>
                <div className="p-2 bg-muted rounded text-lg font-medium">
                  R$ {valorTotalProdutos.toFixed(2)}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor_venda">Valor de Venda *</Label>
                <Input
                  id="valor_venda"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.valor_venda}
                  onChange={(e) => setFormData(d => ({ ...d, valor_venda: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
            </div>

            {desconto > 0 && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-green-700 dark:text-green-300 font-medium">
                  Desconto do Combo: R$ {desconto.toFixed(2)}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="cozinha"
                  checked={formData.feito_pela_cozinha}
                  onCheckedChange={(v) => setFormData(d => ({ ...d, feito_pela_cozinha: v }))}
                />
                <Label htmlFor="cozinha" className="cursor-pointer">
                  Feito pela cozinha
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="ativo"
                  checked={formData.ativo}
                  onCheckedChange={(v) => setFormData(d => ({ ...d, ativo: v }))}
                />
                <Label htmlFor="ativo" className="cursor-pointer">
                  Ativo
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarCombo} disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar Combo?</AlertDialogTitle>
            <AlertDialogDescription>
              O combo "{comboSelecionado?.nome}" será desativado.
              Você pode reativá-lo posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={excluirCombo} disabled={isLoading}>
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
