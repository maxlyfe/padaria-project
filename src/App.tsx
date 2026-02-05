import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Toaster } from '@/components/ui/sonner';

// Pages
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { PDV } from '@/pages/PDV/PDV';
import { Cozinha } from '@/pages/Cozinha/Cozinha';
import { Caixa } from '@/pages/Caixa/Caixa';
import { Admin } from '@/pages/Admin/Admin';
import { Produtos } from '@/pages/Produtos/Produtos';
import { Combos } from '@/pages/Combos/Combos';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Login - Pública */}
            <Route path="/login" element={<Login />} />

            {/* Dashboard - Todas as roles */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* PDV - Garçom, Caixa, Admin */}
            <Route
              path="/pdv"
              element={
                <ProtectedRoute allowedRoles={['admin', 'caixa', 'garcom']}>
                  <PDV />
                </ProtectedRoute>
              }
            />

            {/* Cozinha - Cozinha, Admin */}
            <Route
              path="/cozinha"
              element={
                <ProtectedRoute allowedRoles={['admin', 'cozinha']}>
                  <Cozinha />
                </ProtectedRoute>
              }
            />

            {/* Caixa - Caixa, Admin */}
            <Route
              path="/caixa"
              element={
                <ProtectedRoute allowedRoles={['admin', 'caixa']}>
                  <Caixa />
                </ProtectedRoute>
              }
            />

            {/* Admin - Apenas Admin */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Admin />
                </ProtectedRoute>
              }
            />

            {/* Produtos - Apenas Admin */}
            <Route
              path="/admin/produtos"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Produtos />
                </ProtectedRoute>
              }
            />

            {/* Combos - Apenas Admin */}
            <Route
              path="/admin/combos"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Combos />
                </ProtectedRoute>
              }
            />

            {/* Rota não encontrada */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;