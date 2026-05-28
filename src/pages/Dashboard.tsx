import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLotes, useEliminarLoteConCascada } from '@/hooks/useLotes';
import { formatColones, formatFecha } from '@/utils/calculadora';
import CrearLoteModal from '@/components/CrearLoteModal';
import ConfirmarBorradoModal from '@/components/ConfirmarBorradoModal';
import { Lote } from '@/types';
import './Dashboard.css';

export default function Dashboard() {
  const { userData, logout } = useAuth();
  const { lotes, loading } = useLotes();
  const navigate = useNavigate();
  const { eliminarLoteConCascada } = useEliminarLoteConCascada();

  const [showCrear, setShowCrear] = useState(false);
  const [editLote, setEditLote] = useState<Lote | null>(null);
  const [deleteLote, setDeleteLote] = useState<Lote | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const totalAnimales = lotes.reduce((s, l) => s + l.animalesActivos, 0);
  const totalInvertido = lotes.reduce((s, l) => s + l.totalInvertido, 0);
  const totalUtilidad = lotes.reduce((s, l) => s + l.utilidadTotal, 0);

  async function handleDeleteLote() {
    if (!deleteLote) return;
    setDeletingId(deleteLote.id);
    try {
      await eliminarLoteConCascada(deleteLote.id);
      setDeleteLote(null);
    } catch (err) {
      console.error('[handleDeleteLote]', err);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="dashboard-page">
      {/* Navbar */}
      <header className="navbar">
        <div className="container flex-between">
          <div className="navbar-brand">
            <span>🐄</span>
            <span className="navbar-title">GanaCR</span>
            {userData?.nombreFinca && (
              <span className="navbar-finca">{userData.nombreFinca}</span>
            )}
          </div>
          <div className="navbar-right">
            <span className="navbar-user">{userData?.nombre}</span>
            <button className="btn btn-ghost btn-sm" onClick={logout}>Salir</button>
          </div>
          <button
            className="navbar-hamburger"
            aria-label="Abrir menú"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
        {menuOpen && (
          <div className="navbar-mobile-menu">
            <span className="navbar-user">{userData?.nombre}</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { logout(); setMenuOpen(false); }}
            >
              Salir
            </button>
          </div>
        )}
      </header>

      <main className="container page-content">
        {/* Resumen global */}
        <div className="stats-grid mb-3">
          <div className="stat-card">
            <div className="stat-value">{lotes.length}</div>
            <div className="stat-label">Lotes activos</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{totalAnimales}</div>
            <div className="stat-label">Animales activos</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatColones(totalInvertido)}</div>
            <div className="stat-label">Total invertido</div>
          </div>
          <div className="stat-card">
            <div className={`stat-value ${totalUtilidad >= 0 ? 'text-success' : 'text-danger'}`}>
              {formatColones(totalUtilidad)}
            </div>
            <div className="stat-label">Utilidad total</div>
          </div>
        </div>

        {/* Encabezado lista de lotes */}
        <div className="flex-between mb-2">
          <h2 className="section-title">Mis Lotes</h2>
          <button className="btn btn-primary" onClick={() => setShowCrear(true)}>
            + Nuevo Lote
          </button>
        </div>

        {loading ? (
          <div className="loading-container"><div className="loading-spinner" /><span>Cargando...</span></div>
        ) : lotes.length === 0 ? (
          <div className="empty-state">
            <div className="emoji">🐄</div>
            <h3>Aún no tenés lotes</h3>
            <p>Creá tu primer lote para empezar a registrar tu ganado</p>
            <button className="btn btn-primary" onClick={() => setShowCrear(true)}>Crear primer lote</button>
          </div>
        ) : (
          <div className="lotes-grid">
            {lotes.map((lote) => (
              <div
                key={lote.id}
                className="lote-card"
                onClick={() => navigate(`/lote/${lote.id}`)}
              >
                <div className="lote-card-header">
                  <h3>{lote.nombreLote}</h3>
                  <div className="flex gap-1" style={{ alignItems: 'center' }}>
                    {lote.tipoPropiedad === 'medias' && lote.socio && (
                      <span className="badge badge-yellow">🤝 {lote.socio.nombre}</span>
                    )}
                    <button
                      className="btn btn-ghost btn-sm"
                      title="Editar lote"
                      onClick={(e) => { e.stopPropagation(); setEditLote(lote); }}
                    >✏️</button>
                    <button
                      className="btn btn-ghost btn-sm"
                      title="Eliminar lote"
                      style={{ color: 'var(--color-danger, #dc3545)' }}
                      onClick={(e) => { e.stopPropagation(); setDeleteLote(lote); }}
                    >🗑️</button>
                  </div>
                </div>
                <div className="lote-card-stats">
                  <div>
                    <span className="lote-stat-val">{lote.animalesActivos}</span>
                    <span className="lote-stat-lab">activos</span>
                  </div>
                  <div>
                    <span className="lote-stat-val">{lote.animalesVendidos}</span>
                    <span className="lote-stat-lab">vendidos</span>
                  </div>
                  <div>
                    <span className="lote-stat-val">{formatColones(lote.totalInvertido)}</span>
                    <span className="lote-stat-lab">invertido</span>
                  </div>
                </div>
                <div className="lote-card-footer">
                  <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                    Compra: {formatFecha(lote.fechaCompra)}
                  </span>
                  <span className={`lote-utilidad ${lote.utilidadTotal >= 0 ? 'pos' : 'neg'}`}>
                    {lote.utilidadTotal >= 0 ? '▲' : '▼'} {formatColones(Math.abs(lote.utilidadTotal))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Modales ── */}
      {showCrear && <CrearLoteModal onClose={() => setShowCrear(false)} />}
      {editLote && <CrearLoteModal editData={editLote} onClose={() => setEditLote(null)} />}
      {deleteLote && (
        <ConfirmarBorradoModal
          titulo={`¿Eliminar "${deleteLote.nombreLote}"?`}
          descripcion="Se eliminarán TODOS los animales, pesajes, gastos y ventas de este lote. Esta acción no se puede deshacer."
          loading={deletingId === deleteLote.id}
          onConfirm={handleDeleteLote}
          onClose={() => setDeleteLote(null)}
        />
      )}
    </div>
  );
}
