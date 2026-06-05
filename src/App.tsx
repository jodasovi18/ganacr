import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { FincaProvider } from '@/contexts/FincaContext';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import LoteDetalle from '@/pages/LoteDetalle';
import { ReactNode, lazy, Suspense } from 'react';
import { Toaster } from '@/components/ui/sonner';
import OfflineIndicator from '@/components/OfflineIndicator';

// Páginas legales: carga diferida (rara vez visitadas, no pesan en el bundle inicial).
const Terminos = lazy(() => import('@/pages/Terminos'));
const Privacidad = lazy(() => import('@/pages/Privacidad'));

const cargando = <div className="loading-container"><div className="loading-spinner" /></div>;

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
          <Route path="/terminos" element={<Suspense fallback={cargando}><Terminos /></Suspense>} />
          <Route path="/privacidad" element={<Suspense fallback={cargando}><Privacidad /></Suspense>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-right" richColors />
        <OfflineIndicator />
      </BrowserRouter>
    </AuthProvider>
  );
}
