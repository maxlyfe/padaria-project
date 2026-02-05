import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/services/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  Upload,
  ChefHat,
  Image as ImageIcon
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
  descricao: string | null;
  foto_url: string | null;
  valor: number;
  feito_pela_cozinha: boolean;
  ativo: boolean;
  categoria: string | null;
}

export function Produtos() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    valor: '',
    categoria: '',
    feito_pela_cozinha: false,
    ativo: true,
  });

  useEffect(() => {
    fetchProdutos();
  }, []);

  const fetchProdutos = async () => {
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .order('nome');

    if (error) {
      toast.error('Erro ao carregar produtos');
      return;
    }

    setProdutos(data || []);
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    setUploadingImage(true);
    
    // Preview local
    const reader = new FileReader();
    reader.onloadend = () => setPreviewImage(reader.result as string);
    reader.readAsDataURL(file);

    // Upload para Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('produtos')
      .upload(fileName, file);

    if (uploadError) {
      toast.error('Erro ao fazer upload da imagem');
      setUploadingImage(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('produtos')
      .getPublicUrl(fileName);

    setPreviewImage(publicUrl);
    setUploadingImage(false);
    return publicUrl;
  };

  const abrirDialog = (produto?: Produto) => {
    if (produto) {
      setProdutoSelecionado(produto);
      setFormData({
        nome: produto.nome,
        descricao: produto.descricao || '',
        valor: produto.valor.toString(),
        categoria: produto.categoria || '',
        feito_pela_cozinha: produto.feito_pela_cozinha,
        ativo: produto.ativo,
      });
      setPreviewImage(produto.foto_url);
    } else {
      setProdutoSelecionado(null);
      setFormData({
        nome: '',
        descricao: '',
        valor: '',
        categoria: '',
        feito_pela_cozinha: false,
        ativo: true,
      });
      setPreviewImage(null);
    }
    setDialogOpen(true);
  };

  const salvarProduto = async () => {
    if (!formData.nome.trim()) {
      toast.error('Nome do produto é obrigatório');
      return;
    }

    const valor = parseFloat(formData.valor);
    if (isNaN(valor) || valor < 0) {
      toast.error('Valor inválido');
      return;
    }

    setIsLoading(true);

    const dados = {
      nome: formData.nome,
      descricao: formData.descricao || null,
      valor,
      foto_url: previewImage,
      categoria: formData.categoria || null,
      feito_pela_cozinha: formData.feito_pela_cozinha,
      ativo: formData.ativo,
    };

    if (produtoSelecionado) {
      // Atualizar
      const { error } = await supabase
        .from('produtos')
        .update(dados)
        .eq('id', produtoSelecionado.id);

      if (error) {
        toast.error('Erro ao atualizar produto');
        setIsLoading(false);
        return;
      }
      toast.success('Produto atualizado!');
    } else {
      // Criar
      const { error } = await supabase
        .from('produtos')
        .insert(dados);

      if (error) {
        toast.error('Erro ao criar produto');
        setIsLoading(false);
        return;
      }
      toast.success('Produto criado!');
    }

    setDialogOpen(false);
    fetchProdutos();
    setIsLoading(false);
  };

  const confirmarExclusao = (produto: Produto) => {
    setProdutoSelecionado(produto);
    setDeleteDialogOpen(true);
  };

  const excluirProduto = async () => {
    if (!produtoSelecionado) return;

    setIsLoading(true);

    // Soft delete - apenas desativa
    const { error } = await supabase
      .from('produtos')
      .update({ ativo: false })
      .eq('id', produtoSelecionado.id);

    if (error) {
      toast.error('Erro ao desativar produto');
      setIsLoading(false);
      return;
    }

    setDeleteDialogOpen(false);
    fetchProdutos();
    setIsLoading(false);
    toast.success('Produto desativado!');
  };

  const produtosFiltrados = produtos.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.categoria && p.categoria.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
                <h1 className="text-xl font-bold">Produtos</h1>
                <p className="text-sm text-muted-foreground">
                  {produtos.filter(p => p.ativo).length} ativos
                </p>
              </div>
            </div>
            <Button onClick={() => abrirDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Produto
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
            placeholder="Buscar produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {produtosFiltrados.map((produto) => (
            <Card key={produto.id} className={!produto.ativo ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="h-20 w-20 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {produto.foto_url ? (
                      <img 
                        src={produto.foto_url} 
                        alt={produto.nome}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium truncate">{produto.nome}</h3>
                        <p className="text-lg font-bold text-primary">
                          R$ {produto.valor.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {produto.categoria && (
                        <Badge variant="outline" className="text-xs">
                          {produto.categoria}
                        </Badge>
                      )}
                      {produto.feito_pela_cozinha && (
                        <ChefHat className="h-4 w-4 text-orange-500" />
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => abrirDialog(produto)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => confirmarExclusao(produto)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {produtosFiltrados.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum produto encontrado
          </div>
        )}
      </main>

      {/* Dialog Criar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {produtoSelecionado ? 'Editar Produto' : 'Novo Produto'}
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
                placeholder="Nome do produto"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valor">Valor (R$) *</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.valor}
                  onChange={(e) => setFormData(d => ({ ...d, valor: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria</Label>
                <Input
                  id="categoria"
                  value={formData.categoria}
                  onChange={(e) => setFormData(d => ({ ...d, categoria: e.target.value }))}
                  placeholder="Ex: Bebidas"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData(d => ({ ...d, descricao: e.target.value }))}
                placeholder="Descrição do produto"
              />
            </div>

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
            <Button onClick={salvarProduto} disabled={isLoading || uploadingImage}>
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar Produto?</AlertDialogTitle>
            <AlertDialogDescription>
              O produto "{produtoSelecionado?.nome}" será desativado.
              Você pode reativá-lo posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={excluirProduto} disabled={isLoading}>
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
