import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ThemeToggle';
import { 
  Store, 
  Utensils, 
  DollarSign, 
  Settings, 
  ShoppingCart,
  LogOut,
  Users,
  Package,
  LayoutGrid
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
  const { profile, logout, isAdmin, isCaixa } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    {
      title: 'PDV',
      description: 'Lançar pedidos e gerenciar mesas',
      icon: ShoppingCart,
      path: '/pdv',
      roles: ['admin', 'caixa', 'garcom'],
      color: 'bg-blue-500',
    },
    {
      title: 'Cozinha',
      description: 'Visualizar e gerenciar pedidos',
      icon: Utensils,
      path: '/cozinha',
      roles: ['admin', 'cozinha'],
      color: 'bg-orange-500',
    },
    {
      title: 'Caixa',
      description: 'Fechar contas e fluxo de caixa',
      icon: DollarSign,
      path: '/caixa',
      roles: ['admin', 'caixa'],
      color: 'bg-green-500',
    },
    {
      title: 'Administração',
      description: 'Configurações e cadastros',
      icon: Settings,
      path: '/admin',
      roles: ['admin'],
      color: 'bg-purple-500',
    },
  ];

  const visibleItems = menuItems.filter(item => 
    profile && item.roles.includes(profile.role)
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center">
                <Store className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Padaria PDV</h1>
                <p className="text-sm text-muted-foreground">
                  {isDark ? 'Modo Escuro' : 'Modo Claro'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <div className="text-right hidden sm:block">
                <p className="font-medium">{profile?.nome}</p>
                <p className="text-sm text-muted-foreground capitalize">{profile?.role}</p>
              </div>
              <Button variant="outline" size="icon" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Bem-vindo, {profile?.nome?.split(' ')[0]}!</h2>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {visibleItems.map((item) => (
            <Card
              key={item.path}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(item.path)}
            >
              <CardHeader>
                <div className={`h-12 w-12 ${item.color} rounded-lg flex items-center justify-center mb-4`}>
                  <item.icon className="h-6 w-6 text-white" />
                </div>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Quick Stats - Apenas para Admin e Caixa */}
        {(isAdmin || isCaixa) && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Resumo do Dia</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Vendas Hoje</p>
                      <p className="text-2xl font-bold">R$ 0,00</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Mesas Ativas</p>
                      <p className="text-2xl font-bold">0</p>
                    </div>
                    <LayoutGrid className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pedidos Pendentes</p>
                      <p className="text-2xl font-bold">0</p>
                    </div>
                    <Utensils className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Status Caixa</p>
                      <p className="text-2xl font-bold text-yellow-500">Fechado</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Admin Quick Links */}
        {isAdmin && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Administração Rápida</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                className="h-auto py-4 justify-start"
                onClick={() => navigate('/admin/produtos')}
              >
                <Package className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <p className="font-medium">Produtos</p>
                  <p className="text-sm text-muted-foreground">Cadastrar e gerenciar</p>
                </div>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 justify-start"
                onClick={() => navigate('/admin/combos')}
              >
                <LayoutGrid className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <p className="font-medium">Combos</p>
                  <p className="text-sm text-muted-foreground">Criar combos e promoções</p>
                </div>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 justify-start"
                onClick={() => navigate('/admin')}
              >
                <Users className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <p className="font-medium">Usuários</p>
                  <p className="text-sm text-muted-foreground">Gerenciar equipe</p>
                </div>
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
