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
import { Lote, GastoFinca, Animal, Venta } from '@/types';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { exportarLotesExcel } from '@/utils/exportExcel';
import { Gasto } from '@/types';
import { exportarLotePDF } from '@/utils/exportPDF';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Plus, FileSpreadsheet, FileText, Trash2, Pencil } from 'lucide-react';

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
        animales: animalesSnap.docs.map(d => ({ ...d.data(), id: d.id } as Animal)),
        ventas:   ventasSnap.docs.map(d  => ({ ...d.data(), id: d.id } as Venta)),
        gastos:   gastosSnap.docs.map(d  => ({ ...d.data(), id: d.id } as Gasto)),
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
        const a = { ...d.data(), id: d.id } as Animal;
        if (!animalesPorLote.has(a.loteId)) animalesPorLote.set(a.loteId, []);
        animalesPorLote.get(a.loteId)!.push(a);
      });

      const ventasPorLote = new Map<string, Venta[]>();
      ventasSnap.docs.forEach(d => {
        const v = { ...d.data(), id: d.id } as Venta;
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
    <div className="min-h-screen bg-background">
      {necesitaOnboarding && <OnboardingFinca />}

      {/* Navbar */}
      <header className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-extrabold text-primary text-lg shrink-0">
            🐄 <span className="hidden sm:inline">GanaCR</span>
          </div>
          <div className="flex-1 max-w-xs">
            <FincaSelector />
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{userData?.nombre}</span>
            <Button variant="outline" size="sm" onClick={logout}>Salir</Button>
          </div>
          <button
            className="sm:hidden p-2 rounded-md text-muted-foreground hover:bg-muted"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
        {menuOpen && (
          <div className="sm:hidden bg-white border-t border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{userData?.nombre}</span>
            <Button variant="outline" size="sm" onClick={() => { logout(); setMenuOpen(false); }}>Salir</Button>
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 pb-16">
        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Lotes', value: String(lotes.length), color: '' },
            { label: 'Animales', value: String(totalAnimales), color: '' },
            { label: 'Invertido', value: formatColones(totalInvertido), color: '' },
            {
              label: 'Utilidad',
              value: formatColones(totalUtilidad),
              color: totalUtilidad >= 0 ? 'text-success' : 'text-destructive',
              cardClass: totalUtilidad >= 0 ? 'bg-success-light border-success/30' : '',
            },
          ].map((stat) => (
            <Card key={stat.label} className={stat.cardClass ?? ''}>
              <CardContent className="p-4 flex flex-col items-center justify-center min-h-[72px] gap-1">
                <p className={`text-xl sm:text-2xl font-extrabold leading-none text-center break-words w-full ${stat.color || 'text-foreground'}`}>
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide text-center">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {exportError && <p className="text-sm text-destructive mb-3">{exportError}</p>}
        {pdfError && <p className="text-sm text-destructive mb-3">{pdfError}</p>}

        {/* Tabs */}
        <Tabs value={dashboardTab} onValueChange={(v) => setDashboardTab(v as DashboardTab)}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <TabsList>
              <TabsTrigger value="lotes">Lotes</TabsTrigger>
              <TabsTrigger value="gastosFinca">Gastos de Finca</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              {dashboardTab === 'lotes' && (
                <>
                  <Button variant="outline" size="sm" onClick={handleExportarExcel} disabled={exportando || lotes.length === 0}>
                    <FileSpreadsheet size={14} className="mr-1" />
                    {exportando ? 'Exportando...' : 'Excel'}
                  </Button>
                  <Button size="sm" onClick={() => setShowCrear(true)} disabled={!fincaActiva}>
                    <Plus size={14} className="mr-1" /> Nuevo lote
                  </Button>
                </>
              )}
              {dashboardTab === 'gastosFinca' && (
                <Button size="sm" onClick={() => setShowGastoFinca(true)}>
                  <Plus size={14} className="mr-1" /> Nuevo gasto
                </Button>
              )}
            </div>
          </div>

          <TabsContent value="lotes">
            {loading ? (
              <p className="text-center text-muted-foreground py-12">Cargando lotes...</p>
            ) : lotes.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🐄</p>
                <p className="text-muted-foreground">No tenés lotes todavía.</p>
                <Button className="mt-4" onClick={() => setShowCrear(true)} disabled={!fincaActiva}>Crear primer lote</Button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {lotes.map((lote) => (
                  <Card key={lote.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      {/* Título + badge status */}
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-foreground leading-tight">{lote.nombreLote}</h3>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {lote.tipoPropiedad === 'medias' && lote.socio && (
                            <Badge variant="secondary" className="text-xs">🤝 {lote.socio.nombre}</Badge>
                          )}
                          {/* PDF/Excel secundarios */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreVertical size={14} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleGenerarPDF(lote)} disabled={generandoPDF}>
                                <FileText size={14} className="mr-2" /> {generandoPDF ? 'Generando...' : 'PDF Lote'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Stats */}
                      <p className="text-sm text-muted-foreground">
                        {lote.animalesActivos} animales · {formatColones(lote.totalInvertido)}
                      </p>
                      {lote.utilidadTotal !== 0 && (
                        <p className={`text-sm font-semibold mt-0.5 ${lote.utilidadTotal >= 0 ? 'text-success' : 'text-destructive'}`}>
                          Utilidad: {formatColones(lote.utilidadTotal)}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">Compra: {formatFecha(lote.fechaCompra)}</p>

                      {/* Botones de acción visibles — igual al mockup */}
                      <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => navigate(`/lote/${lote.id}`)}
                        >
                          Ver lote →
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditLote(lote)}
                        >
                          <Pencil size={13} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/5"
                          onClick={() => setDeleteLote(lote)}
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="gastosFinca">
            <GastosFincaTab
              gastosFinca={gastosFinca}
              loading={gastosFincaLoading}
              onNuevo={() => setShowGastoFinca(true)}
              onEliminar={setDeleteGastoFinca}
              deletingId={deletingGastoFincaId}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Modales */}
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
