import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Upload,
  ChefHat,
  Package,
  ArrowLeft,
} from 'lucide-react';

interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  foto_url: string | null;
  valor: number;
  feito_pela_cozinha: boolean;
  ativo: boolean;
  categoria: string | null;
  created_at: string;
}

export function Produtos() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    valor: '',
    categoria: '',
    feito_pela_cozinha: false,
    ativo: true,
    foto_url: '',
  });

  // Verificar se é admin
  useEffect(() => {
    if (profile?.role !== 'admin') {
      toast.error('Acesso negado');
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  // Carregar produtos
  const loadProdutos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .order('nome');

      if (error) throw error;
      setProdutos(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar produtos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProdutos();
  }, []);

  // Filtrar produtos
  const produtosFiltrados = produtos.filter((p) =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Upload de imagem
  const handleImageUpload = async (file: File) => {
    try {
      setUploadingImage(true);
      
      // Validar arquivo
      if (!file.type.startsWith('image/')) {
        toast.error('O arquivo deve ser uma imagem');
        return;
      }
      
      if (file.size > 2 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 2MB');
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload para o Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('produtos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('produtos')
        .getPublicUrl(filePath);

      setFormData((prev) => ({ ...prev, foto_url: publicUrl }));
      toast.success('Imagem carregada com sucesso');
    } catch (error: any) {
      toast.error('Erro ao fazer upload: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  // Salvar produto
  const handleSave = async () => {
    try {
      if (!formData.nome.trim()) {
        toast.error('O nome do produto é obrigatório');
        return;
      }

      if (!formData.valor || parseFloat(formData.valor) <= 0) {
        toast.error('O valor deve ser maior que zero');
        return;
      }

      const produtoData = {
        nome: formData.nome.trim(),
        descricao: formData.descricao.trim() || null,
        valor: parseFloat(formData.valor),
        categoria: formData.categoria.trim() || null,
        feito_pela_cozinha: formData.feito_pela_cozinha,
        ativo: formData.ativo,
        foto_url: formData.foto_url || null,
      };

      if (editingProduto) {
        // Atualizar
        const { error } = await supabase
          .from('produtos')
          .update(produtoData)
          .eq('id', editingProduto.id);

        if (error) throw error;
        toast.success('Produto atualizado com sucesso');
      } else {
        // Criar novo
        const { error } = await supabase
          .from('produtos')
          .insert([produtoData]);

        if (error) throw error;
        toast.success('Produto criado com sucesso');
      }

      setIsDialogOpen(false);
      resetForm();
      loadProdutos();
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    }
  };

  // Deletar produto
  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    try {
      const { error } = await supabase
        .from('produtos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Produto excluído com sucesso');
      loadProdutos();
    } catch (error: any) {
      toast.error('Erro ao excluir: ' + error.message);
    }
  };

  // Abrir dialog para editar
  const handleEdit = (produto: Produto) => {
    setEditingProduto(produto);
    setFormData({
      nome: produto.nome,
      descricao: produto.descricao || '',
      valor: produto.valor.toString(),
      categoria: produto.categoria || '',
      feito_pela_cozinha: produto.feito_pela_cozinha,
      ativo: produto.ativo,
      foto_url: produto.foto_url || '',
    });
    setIsDialogOpen(true);
  };

  // Abrir dialog para novo
  const handleNew = () => {
    setEditingProduto(null);
    resetForm();
    setIsDialogOpen(true);
  };

  // Resetar formulário
  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      valor: '',
      categoria: '',
      feito_pela_cozinha: false,
      ativo: true,
      foto_url: '',
    });
  };

  // Formatar valor em reais
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
            <p className="text-muted-foreground">
              Gerencie os produtos da padaria
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/admin')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button onClick={handleNew}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Produto
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lista de Produtos */}
        <Card>
          <CardHeader>
            <CardTitle>
              Produtos ({produtosFiltrados.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : produtosFiltrados.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center text-center">
                <Package className="h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-lg font-medium">Nenhum produto encontrado</p>
                <p className="text-sm text-muted-foreground">
                  Clique em "Novo Produto" para adicionar
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Foto</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Cozinha</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {produtosFiltrados.map((produto) => (
                      <TableRow key={produto.id}>
                        <TableCell>
                          {produto.foto_url ? (
                            <img
                              src={produto.foto_url}
                              alt={produto.nome}
                              className="h-12 w-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                              <Package className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {produto.nome}
                          {produto.descricao && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {produto.descricao}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {produto.categoria ? (
                            <Badge variant="secondary">{produto.categoria}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono">
                          {formatCurrency(produto.valor)}
                        </TableCell>
                        <TableCell>
                          {produto.feito_pela_cozinha ? (
                            <Badge variant="default" className="gap-1">
                              <ChefHat className="h-3 w-3" />
                              Sim
                            </Badge>
                          ) : (
                            <Badge variant="outline">Não</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {produto.ativo ? (
                            <Badge className="bg-green-500">Ativo</Badge>
                          ) : (
                            <Badge variant="destructive">Inativo</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(produto)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete(produto.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Cadastro/Edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduto ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Upload de Imagem */}
            <div className="space-y-2">
              <Label>Foto do Produto</Label>
              <div className="flex items-center gap-4">
                {formData.foto_url ? (
                  <div className="relative">
                    <img
                      src={formData.foto_url}
                      alt="Preview"
                      className="h-32 w-32 rounded-lg object-cover"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -right-2 -top-2 h-6 w-6"
                      onClick={() => setFormData((d) => ({ ...d, foto_url: '' }))}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="flex h-32 w-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadingImage ? (
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <span className="mt-1 text-xs text-muted-foreground">
                          Adicionar foto
                        </span>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Nome */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData((d) => ({ ...d, nome: e.target.value }))
                  }
                  placeholder="Nome do produto"
                />
              </div>

              {/* Valor */}
              <div className="space-y-2">
                <Label htmlFor="valor">Valor (R$) *</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.valor}
                  onChange={(e) =>
                    setFormData((d) => ({ ...d, valor: e.target.value }))
                  }
                  placeholder="0,00"
                />
              </div>

              {/* Categoria */}
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria</Label>
                <Input
                  id="categoria"
                  value={formData.categoria}
                  onChange={(e) =>
                    setFormData((d) => ({ ...d, categoria: e.target.value }))
                  }
                  placeholder="Ex: Bebidas, Salgados, Doces"
                />
              </div>

              {/* Descrição */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) =>
                    setFormData((d) => ({ ...d, descricao: e.target.value }))
                  }
                  placeholder="Descrição do produto"
                />
              </div>
            </div>

            {/* Switches */}
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex items-center space-x-2">
                <Switch
                  id="cozinha"
                  checked={formData.feito_pela_cozinha}
                  onCheckedChange={(v) =>
                    setFormData((d) => ({ ...d, feito_pela_cozinha: v }))
                  }
                />
                <Label htmlFor="cozinha" className="cursor-pointer">
                  Feito pela cozinha
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="ativo"
                  checked={formData.ativo}
                  onCheckedChange={(v) =>
                    setFormData((d) => ({ ...d, ativo: v }))
                  }
                />
                <Label htmlFor="ativo" className="cursor-pointer">
                  Ativo
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={uploadingImage}>
              {editingProduto ? 'Atualizar' : 'Criar'} Produto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}