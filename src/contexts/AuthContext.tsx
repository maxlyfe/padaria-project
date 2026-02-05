import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '@/services/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { UserRole } from '@/types/database';

interface Profile {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  ativo: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
  hasRole: (roles: UserRole[]) => boolean;
  isAdmin: boolean;
  isCaixa: boolean;
  isCozinha: boolean;
  isGarcom: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Buscar perfil do usuário
  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Erro ao buscar perfil:', error);
      return null;
    }

    return data as Profile;
  };

  // Inicializar autenticação
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      
      // Verificar sessão atual
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (currentSession) {
        setSession(currentSession);
        setUser(currentSession.user);
        const userProfile = await fetchProfile(currentSession.user.id);
        setProfile(userProfile);
      }

      // Escutar mudanças de autenticação
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event, newSession) => {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          
          if (newSession?.user) {
            const userProfile = await fetchProfile(newSession.user.id);
            setProfile(userProfile);
          } else {
            setProfile(null);
          }
        }
      );

      setIsLoading(false);

      return () => {
        subscription.unsubscribe();
      };
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  const hasRole = (roles: UserRole[]) => {
    if (!profile) return false;
    return roles.includes(profile.role);
  };

  const value: AuthContextType = {
    user,
    profile,
    session,
    isLoading,
    isAuthenticated: !!user && !!profile?.ativo,
    login,
    logout,
    hasRole,
    isAdmin: profile?.role === 'admin',
    isCaixa: profile?.role === 'caixa',
    isCozinha: profile?.role === 'cozinha',
    isGarcom: profile?.role === 'garcom',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}
