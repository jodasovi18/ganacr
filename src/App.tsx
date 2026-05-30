import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { FincaProvider } from '@/contexts/FincaContext';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import LoteDetalle from '@/pages/LoteDetalle';
import { ReactNode } from 'react';
import { Toaster } from '@/components/ui/sonner';

function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-container"><div className="loading-spinner" /></div>;
  return user ? <FincaProvider>{children}</FincaProvider> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-container"><div className="loading-spinner" /></div>;
  return user ? <Navigate to="/" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/lote/:loteId" element={<PrivateRoute><LoteDetalle /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}
