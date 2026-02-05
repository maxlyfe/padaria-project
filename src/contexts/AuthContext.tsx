import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '@/services/supabase';
import type { User, Session } from '@supabase/supabase-js';

type UserRole = 'admin' | 'caixa' | 'cozinha' | 'garcom';

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

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      console.log('🔍 Buscando perfil para userId:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Erro ao buscar perfil:', error);
        
        // Se perfil não existe, tentar criar um básico
        if (error.code === 'PGRST116') {
          console.log('Perfil não encontrado, tentando criar...');
          return null;
        }
        
        return null;
      }

      console.log('✅ Perfil encontrado:', data);
      return data as Profile;
    } catch (err) {
      console.error('Exceção ao buscar perfil:', err);
      return null;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      
      try {
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Erro ao buscar sessão:', sessionError);
        }
        
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          const userProfile = await fetchProfile(currentSession.user.id);
          setProfile(userProfile);
        }
      } catch (err) {
        console.error('Erro na inicialização auth:', err);
      }

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

  const login = async (email: string, password: string): Promise<{ error: Error | null }> => {
    console.log('🚀 Iniciando login para:', email);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Erro no login:', error);
        return { error: new Error(error.message) };
      }

      if (!data?.user) {
        return { error: new Error('Usuário não retornado') };
      }

      console.log('✅ Login bem-sucedido, buscando perfil...');
      
      // Buscar perfil imediatamente após login
      const userProfile = await fetchProfile(data.user.id);
      
      if (!userProfile) {
        console.warn('⚠️ Perfil não encontrado após login');
        // Não retornar erro — deixar o usuário logar mesmo sem perfil completo
      }

      return { error: null };
      
    } catch (err) {
      console.error('Exceção no login:', err);
      return { error: err instanceof Error ? err : new Error('Erro desconhecido') };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Erro no logout:', err);
    } finally {
      setUser(null);
      setProfile(null);
      setSession(null);
    }
  };

  const hasRole = (roles: UserRole[]): boolean => {
    if (!profile) return false;
    return roles.includes(profile.role);
  };

  const isAuthenticated = !!user && !!profile && profile.ativo === true;

  const value: AuthContextType = {
    user,
    profile,
    session,
    isLoading,
    isAuthenticated,
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

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}