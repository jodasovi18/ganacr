import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFinca } from '@/contexts/FincaContext';
import { useLotes, useEliminarLoteConCascada } from '@/hooks/useLotes';
import { formatColones, formatFecha } from '@/utils/calculadora';
import CrearLoteModal from '@/components/CrearLoteModal';
import ConfirmarBorradoModal from '@/components/ConfirmarBorradoModal';
import FincaSelector from '@/components/FincaSelector';
import OnboardingFinca from '@/components/OnboardingFinca';
import { useGastosFinca, useEliminarGastoFinca } from '@/hooks/useGastosFinca';
import GastoFincaModal from '@/components/GastoFincaModal';
import GastosFincaTab from '@/components/GastosFincaTab';
import { Lote, GastoFinca } from '@/types';
import { Animal, Venta } from '@/types';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { exportarLotesExcel } from '@/utils/exportExcel';
import { Gasto } from '@/types';
import { exportarLotePDF } from '@/utils/exportPDF';
import './Dashboard.css';

type DashboardTab = 'lotes' | 'gastosFinca';

export default function Dashboard() {
  const { userData, logout, user } = useAuth();
  const { fincaActiva, necesitaOnboarding } = useFinca();
  const { lotes, loading } = useLotes(fincaActiva?.id ?? null);
  const navigate = useNavigate();
  const { eliminarLoteConCascada } = useEliminarLoteConCascada();

  const [showCrear, setShowCrear] = useState(false);
  const [editLote, setEditLote] = useState<Lote | null>(null);
  const [deleteLote, setDeleteLote] = useState<Lote | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const [exportError, setExportError] = useState('');
  const [pdfDropdownOpen, setPdfDropdownOpen] = useState(false);
  const [generandoPDF, setGenerandoPDF]       = useState(false);
  const [pdfError, setPdfError]               = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  // Gastos de Finca
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('lotes');
  const [showGastoFinca, setShowGastoFinca] = useState(false);
  const [deleteGastoFinca, setDeleteGastoFinca] = useState<GastoFinca | null>(null);
  const [deletingGastoFincaId, setDeletingGastoFincaId] = useState<string | null>(null);
  const { gastosFinca, loading: gastosFincaLoading } = useGastosFinca(fincaActiva?.id ?? null);
  const { eliminarGastoFinca } = useEliminarGastoFinca();

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

  async function handleEliminarGastoFinca() {
    if (!deleteGastoFinca) return;
    setDeletingGastoFincaId(deleteGastoFinca.id);
    try {
      await eliminarGastoFinca(deleteGastoFinca.id, deleteGastoFinca.lotesAplicados);
      setDeleteGastoFinca(null);
    } catch (err) {
      console.error('[handleEliminarGastoFinca]', err);
    } finally {
      setDeletingGastoFincaId(null);
    }
  }

  async function handleGenerarPDF(lote: Lote) {
    if (!user || !fincaActiva) return;
    setPdfDropdownOpen(false);
    setGenerandoPDF(true);
    setPdfError('');
    try {
      let timeoutId: ReturnType<typeof setTimeout>;
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('timeout')), 15_000);
      });
      const [animalesSnap, ventasSnap, gastosSnap] = await Promise.race([
        Promise.all([
          getDocs(query(collection(db, 'animales'), where('userId', '==', user.uid), where('loteId', '==', lote.id))),
          getDocs(query(collection(db, 'ventas'),   where('userId', '==', user.uid), where('loteId', '==', lote.id))),
          getDocs(query(collection(db, 'gastos'),   where('userId', '==', user.uid), where('loteId', '==', lote.id))),
        ]).then(result => { clearTimeout(timeoutId!); return result; }),
        timeout,
      ]);

      await exportarLotePDF({
        lote,
        animales: animalesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Animal)),
        ventas:   ventasSnap.docs.map(d  => ({ id: d.id, ...d.data() } as Venta)),
        gastos:   gastosSnap.docs.map(d  => ({ id: d.id, ...d.data() } as Gasto)),
        nombreFinca: fincaActiva.nombre,
        fechaGenerado: new Date().toISOString().substring(0, 10),
      });
    } catch (err) {
      console.error('[Dashboard] Error generando PDF:', err);
      setPdfError('No se pudo generar el PDF. Intentá de nuevo.');
    } finally {
      setGenerandoPDF(false);
    }
  }

  async function handleExportarExcel() {
    if (!fincaActiva || !user || lotes.length === 0) return;
    setExportando(true);
    setExportError('');
    try {
      let timeoutId: ReturnType<typeof setTimeout>;
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('timeout')), 15_000);
      });
      const [animalesSnap, ventasSnap] = await Promise.race([
        Promise.all([
          getDocs(query(collection(db, 'animales'), where('userId', '==', user.uid), where('fincaId', '==', fincaActiva.id))),
          getDocs(query(collection(db, 'ventas'),   where('userId', '==', user.uid), where('fincaId', '==', fincaActiva.id))),
        ]).then(result => { clearTimeout(timeoutId); return result; }),
        timeout,
      ]);

      const animalesPorLote = new Map<string, Animal[]>();
      animalesSnap.docs.forEach(d => {
        const a = { id: d.id, ...d.data() } as Animal;
        if (!animalesPorLote.has(a.loteId)) animalesPorLote.set(a.loteId, []);
        animalesPorLote.get(a.loteId)!.push(a);
      });

      const ventasPorLote = new Map<string, Venta[]>();
      ventasSnap.docs.forEach(d => {
        const v = { id: d.id, ...d.data() } as Venta;
        if (!ventasPorLote.has(v.loteId)) ventasPorLote.set(v.loteId, []);
        ventasPorLote.get(v.loteId)!.push(v);
      });

      exportarLotesExcel(lotes, animalesPorLote, ventasPorLote, fincaActiva.nombre);
    } catch (err) {
      console.error('[Dashboard] Error exportando Excel:', err);
      setExportError('No se pudo exportar. Intentá de nuevo.');
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="dashboard-page">
      {/* Onboarding modal — shown only when user has no fincas */}
      {necesitaOnboarding && <OnboardingFinca />}

      {/* Navbar */}
      <header className="navbar">
        <div className="container flex-between">
          <div className="navbar-brand">
            <span>🐄</span>
            <span className="navbar-title">GanaCR</span>
          </div>
          <FincaSelector />
          <div className="navbar-right">
            <span className="navbar-user">{userData?.nombre}</span>
            <button className="btn btn-ghost btn-sm" onClick={logout}>Salir</button>
          </div>
          <button
            className="navbar-hamburger"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
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

        {/* ── Tabs ── */}
        <div className="dashboard-tabs">
          <button
            className={`dashboard-tab${dashboardTab === 'lotes' ? ' active' : ''}`}
            onClick={() => setDashboardTab('lotes')}
          >
            🐄 Lotes ({lotes.length})
          </button>
          <button
            className={`dashboard-tab${dashboardTab === 'gastosFinca' ? ' active' : ''}`}
            onClick={() => setDashboardTab('gastosFinca')}
          >
            💸 Gastos de Finca ({gastosFinca.length})
          </button>
        </div>

        {/* ── Tab: Lotes ── */}
        {dashboardTab === 'lotes' && (
          <>
            <div className="flex-between mb-2">
              <h2 className="section-title">Mis Lotes</h2>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {(exportError || pdfError) && (
                  <span className="export-error-text">{exportError || pdfError}</span>
                )}
                {lotes.length > 0 && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleExportarExcel}
                    disabled={exportando || !fincaActiva}
                  >
                    {exportando ? '⏳ Exportando...' : '📊 Excel'}
                  </button>
                )}
                {lotes.length > 0 && (
                  <div className="pdf-dropdown-wrap">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setPdfDropdownOpen(o => !o)}
                      disabled={generandoPDF || !fincaActiva}
                    >
                      {generandoPDF ? '⏳ Generando...' : '📄 PDF'}
                    </button>
                    {pdfDropdownOpen && (
                      <>
                        <div className="pdf-dropdown-overlay" onClick={() => setPdfDropdownOpen(false)} />
                        <div className="pdf-dropdown">
                          {lotes.map(l => (
                            <button
                              key={l.id}
                              className="pdf-dropdown-item"
                              onClick={() => handleGenerarPDF(l)}
                            >
                              {l.nombreLote}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
                <button
                  className="btn btn-primary"
                  onClick={() => setShowCrear(true)}
                  disabled={!fincaActiva}
                >
                  + Nuevo Lote
                </button>
              </div>
            </div>

            {loading ? (
              <div className="loading-container"><div className="loading-spinner" /><span>Cargando...</span></div>
            ) : lotes.length === 0 ? (
              <div className="empty-state">
                <div className="emoji">🐄</div>
                <h3>Aún no tenés lotes</h3>
                <p>Creá tu primer lote para empezar a registrar tu ganado</p>
                <button className="btn btn-primary" onClick={() => setShowCrear(true)} disabled={!fincaActiva}>
                  Crear primer lote
                </button>
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
          </>
        )}

        {/* ── Tab: Gastos de Finca ── */}
        {dashboardTab === 'gastosFinca' && (
          <GastosFincaTab
            gastosFinca={gastosFinca}
            loading={gastosFincaLoading}
            onNuevo={() => setShowGastoFinca(true)}
            onEliminar={setDeleteGastoFinca}
            deletingId={deletingGastoFincaId}
          />
        )}
      </main>

      {/* ── Modales ── */}
      {showCrear && fincaActiva && (
        <CrearLoteModal fincaId={fincaActiva.id} onClose={() => setShowCrear(false)} />
      )}
      {editLote && (
        <CrearLoteModal fincaId={editLote.fincaId} editData={editLote} onClose={() => setEditLote(null)} />
      )}
      {deleteLote && (
        <ConfirmarBorradoModal
          titulo={`¿Eliminar "${deleteLote.nombreLote}"?`}
          descripcion="Se eliminarán TODOS los animales, pesajes, gastos y ventas de este lote. Esta acción no se puede deshacer."
          loading={deletingId === deleteLote.id}
          onConfirm={handleDeleteLote}
          onClose={() => setDeleteLote(null)}
        />
      )}

      {showGastoFinca && fincaActiva && (
        <GastoFincaModal
          fincaId={fincaActiva.id}
          lotes={lotes}
          onClose={() => setShowGastoFinca(false)}
        />
      )}

      {deleteGastoFinca && (
        <ConfirmarBorradoModal
          titulo="Eliminar gasto de finca"
          descripcion={`Se eliminarán también los gastos distribuidos en ${deleteGastoFinca.lotesAplicados.length} lote${deleteGastoFinca.lotesAplicados.length !== 1 ? 's' : ''}.`}
          loading={!!deletingGastoFincaId}
          onConfirm={handleEliminarGastoFinca}
          onClose={() => setDeleteGastoFinca(null)}
        />
      )}
    </div>
  );
}
