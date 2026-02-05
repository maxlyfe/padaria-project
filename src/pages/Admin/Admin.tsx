import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Users, 
  Package, 
  LayoutGrid, 
  Settings,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Admin() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const adminModules = [
    {
      title: 'Produtos',
      description: 'Cadastrar, editar e gerenciar produtos do cardápio',
      icon: Package,
      path: '/admin/produtos',
      color: 'bg-blue-500',
    },
    {
      title: 'Combos',
      description: 'Criar combos e promoções especiais',
      icon: LayoutGrid,
      path: '/admin/combos',
      color: 'bg-purple-500',
    },
    {
      title: 'Usuários',
      description: 'Gerenciar equipe e permissões',
      icon: Users,
      path: '#',
      color: 'bg-green-500',
      disabled: true,
    },
    {
      title: 'Relatórios',
      description: 'Vendas, produtos e análises',
      icon: TrendingUp,
      path: '#',
      color: 'bg-orange-500',
      disabled: true,
    },
    {
      title: 'Configurações',
      description: 'Configurações do sistema',
      icon: Settings,
      path: '#',
      color: 'bg-gray-500',
      disabled: true,
    },
    {
      title: 'Financeiro',
      description: 'Controle financeiro detalhado',
      icon: DollarSign,
      path: '#',
      color: 'bg-emerald-500',
      disabled: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Administração</h1>
              <p className="text-sm text-muted-foreground">Gerenciamento do sistema</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <p className="text-muted-foreground">
            Logado como <span className="font-medium text-foreground">{profile?.nome}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {adminModules.map((module) => (
            <Card
              key={module.title}
              className={`${module.disabled ? 'opacity-60' : 'cursor-pointer hover:shadow-lg transition-shadow'}`}
              onClick={() => !module.disabled && navigate(module.path)}
            >
              <CardHeader>
                <div className={`h-12 w-12 ${module.color} rounded-lg flex items-center justify-center mb-4`}>
                  <module.icon className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="flex items-center gap-2">
                  {module.title}
                  {module.disabled && (
                    <span className="text-xs font-normal px-2 py-1 bg-muted rounded-full">
                      Em breve
                    </span>
                  )}
                </CardTitle>
                <CardDescription>{module.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
