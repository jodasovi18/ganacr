import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLote } from '@/hooks/useLotes';
import { useAnimales, useEliminarAnimal, useAnularMuerte } from '@/hooks/useAnimales';
import { useGastos, useEliminarGasto } from '@/hooks/useGastos';
import { useVentas, useAnularVenta } from '@/hooks/useVentas';
import { formatColones, formatKg, formatFecha } from '@/utils/calculadora';
import AgregarAnimalModal from '@/components/AgregarAnimalModal';
import AgregarGastoModal from '@/components/AgregarGastoModal';
import RegistrarPesoModal from '@/components/RegistrarPesoModal';
import VenderAnimalesModal from '@/components/VenderAnimalesModal';
import ConfirmarBorradoModal from '@/components/ConfirmarBorradoModal';
import { useFinca } from '@/contexts/FincaContext';
import { useAuth } from '@/contexts/AuthContext';
import { exportarLotePDF, exportarSocioPDF } from '@/utils/exportPDF';
import PesosTab from '@/components/PesosTab';
import { Animal, Gasto, Venta, EventoSanitario } from '@/types';
import AnimalesFilterBar from '@/components/AnimalesFilterBar';
import { filtrarAnimales, FiltroAnimales, FILTRO_VACIO } from '@/utils/filtrarAnimales';
import { useAllLotes } from '@/hooks/useLotes';
import MoverAnimalesModal from '@/components/MoverAnimalesModal';
import RegistrarMuerteModal from '@/components/RegistrarMuerteModal';
import { exportarLotesExcel } from '@/utils/exportExcel';
import { useEventosSanitarios, useEliminarEventoSanitario } from '@/hooks/useEventosSanitarios';
import SanidadTab from '@/components/SanidadTab';
import FinanzasLoteTab from '@/components/FinanzasLoteTab';
import EventoSanitarioModal from '@/components/EventoSanitarioModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ArrowLeft, Plus, MoreVertical, FileSpreadsheet, FileText, Trash2, Pencil, Scale } from 'lucide-react';

type Tab = 'animales' | 'gastos' | 'ventas' | 'pesos' | 'sanidad' | 'finanzas';

export default function LoteDetalle() {
  const { loteId } = useParams<{ loteId: string }>();
  const { lote, loading } = useLote(loteId ?? null);
  const { animales } = useAnimales(loteId ?? null);
  const { gastos } = useGastos(loteId ?? null);
  const { ventas } = useVentas(loteId ?? null);
  const navigate = useNavigate();
  const { fincaActiva, fincas } = useFinca();
  const { userData } = useAuth();
  const { lotes: todosLosLotes } = useAllLotes();

  const { eliminarAnimal } = useEliminarAnimal();
  const { eliminarGasto } = useEliminarGasto();
  const { anularVenta } = useAnularVenta();
  const { anularMuerte } = useAnularMuerte();

  const { eventos, loading: loadingEventos } = useEventosSanitarios(loteId ?? null);
  const { eliminarEvento } = useEliminarEventoSanitario();

  const [showSanidad, setShowSanidad]                     = useState(false);
  const [sanidadAnimalInicial, setSanidadAnimalInicial]   = useState<string | undefined>(undefined);
  const [eventoToDelete, setEventoToDelete]               = useState<EventoSanitario | null>(null);
  const [deletingEventoId, setDeletingEventoId]           = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>('animales');

  // Create modals
  const [showAnimal, setShowAnimal] = useState(false);
  const [showGasto, setShowGasto] = useState(false);
  const [showPeso, setShowPeso] = useState(false);
  const [showVenta, setShowVenta] = useState(false);
  const [animalPeso, setAnimalPeso] = useState<Animal | null>(null);

  // Edit modals
  const [editAnimal, setEditAnimal] = useState<Animal | null>(null);
  const [editGasto, setEditGasto] = useState<Gasto | null>(null);

  // Delete confirms
  const [deleteAnimal, setDeleteAnimal] = useState<Animal | null>(null);
  const [deleteGasto, setDeleteGasto] = useState<Gasto | null>(null);
  const [deleteVenta, setDeleteVenta] = useState<Venta | null>(null);
  const [muerteAnimal, setMuerteAnimal] = useState<Animal | null>(null);
  const [revertMuerteAnimal, setRevertMuerteAnimal] = useState<Animal | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  const [filtro, setFiltro] = useState<FiltroAnimales>(FILTRO_VACIO);

  // Mover animales — selection mode
  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [animalesAMover, setAnimalesAMover] = useState<Animal[]>([]);

  const animalesMap = useMemo<Record<string, string>>(
    () => Object.fromEntries(animales.map(a => [a.id, a.numeroArete])),
    [animales]
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!lote) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Lote no encontrado.</p>
      </div>
    );
  }

  const animalesActivos = animales.filter((a) => a.estado === 'activo');
  const animalesFiltrados = filtrarAnimales(animales, filtro).filter((a) =>
    a.numeroArete.toLowerCase().includes(filterText.toLowerCase())
  );
  const razasDisponibles = Array.from(new Set(animales.map((a) => a.raza))).sort();

  async function handleDeleteAnimal() {
    if (!deleteAnimal) return;
    setDeletingId(deleteAnimal.id);
    try {
      await eliminarAnimal(deleteAnimal);
      setDeleteAnimal(null);
    } catch (err) {
      console.error('[handleDeleteAnimal]', err);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteGasto() {
    if (!deleteGasto) return;
    setDeletingId(deleteGasto.id);
    try {
      await eliminarGasto(deleteGasto.id, loteId!, deleteGasto.monto);
      setDeleteGasto(null);
    } catch (err) {
      console.error('[handleDeleteGasto]', err);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleAnularVenta() {
    if (!deleteVenta) return;
    setDeletingId(deleteVenta.id);
    try {
      await anularVenta(deleteVenta.id);
      setDeleteVenta(null);
    } catch (err) {
      console.error('[handleAnularVenta]', err);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleRevertMuerte() {
    if (!revertMuerteAnimal) return;
    setDeletingId(revertMuerteAnimal.id);
    try {
      await anularMuerte(revertMuerteAnimal);
      setRevertMuerteAnimal(null);
    } catch (err) {
      console.error('[handleRevertMuerte]', err);
    } finally {
      setDeletingId(null);
    }
  }

  function toggleSeleccion(animalId: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(animalId)) next.delete(animalId);
      else next.add(animalId);
      return next;
    });
  }

  async function confirmarEliminarEvento() {
    if (!eventoToDelete) return;
    setDeletingEventoId(eventoToDelete.id);
    try {
      await eliminarEvento(eventoToDelete);
    } catch (err) {
      console.error('[LoteDetalle] Error eliminando evento sanitario:', err);
    } finally {
      setDeletingEventoId(null);
      setEventoToDelete(null);
    }
  }

  function cancelarModo() {
    setModoSeleccion(false);
    setSeleccionados(new Set());
  }

  function abrirMoverModal(animalesSeleccionados: Animal[]) {
    setAnimalesAMover(animalesSeleccionados);
  }

  async function handleExportarExcel() {
    if (!lote || !fincaActiva) return;
    const animalesPorLote = new Map([[lote.id, animales]]);
    const ventasPorLote   = new Map([[lote.id, ventas]]);
    await exportarLotesExcel([lote], animalesPorLote, ventasPorLote, fincaActiva.nombre);
  }

  async function handleGenerarPDF() {
    if (!lote || !fincaActiva) return;
    try {
      await exportarLotePDF({
        lote,
        animales,
        ventas,
        gastos,
        nombreFinca: fincaActiva.nombre,
        fechaGenerado: new Date().toISOString().substring(0, 10),
      });
    } catch (err) {
      console.error('[LoteDetalle] Error generando PDF:', err);
    }
  }

  async function handleGenerarPDFSocio() {
    if (!lote || !fincaActiva || !lote.socio) return;
    try {
      await exportarSocioPDF({
        lote,
        animales,
        ventas,
        gastos,
        nombreFinca: fincaActiva.nombre,
        nombreDueno: userData?.nombre ?? '',
        fechaGenerado: new Date().toISOString().substring(0, 10),
      });
    } catch (err) {
      console.error('[LoteDetalle] Error generando PDF socio:', err);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <Button variant="ghost" size="sm" className="mb-2 -ml-2" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Volver
          </Button>

          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-foreground">{lote.nombreLote}</h1>
              {lote.tipoPropiedad === 'medias' && lote.socio && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  🤝 A medias con <strong>{lote.socio.nombre}</strong> ({lote.socio.porcentaje}% / {100 - lote.socio.porcentaje}%)
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">Compra: {formatFecha(lote.fechaCompra)}</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" onClick={() => setShowAnimal(true)}>
                <Plus className="w-4 h-4 mr-1" /> Animal
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowGasto(true)}>
                <Plus className="w-4 h-4 mr-1" /> Gasto
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {animalesActivos.length > 0 && (
                    <DropdownMenuItem onClick={() => setShowVenta(true)}>
                      💰 Vender animales
                    </DropdownMenuItem>
                  )}
                  {animales.length > 0 && (
                    <DropdownMenuItem onClick={handleExportarExcel}>
                      <FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar Excel
                    </DropdownMenuItem>
                  )}
                  {animales.length > 0 && (
                    <DropdownMenuItem onClick={handleGenerarPDF}>
                      <FileText className="w-4 h-4 mr-2" /> PDF Lote
                    </DropdownMenuItem>
                  )}
                  {animales.length > 0 && lote.tipoPropiedad === 'medias' && lote.socio && (
                    <DropdownMenuItem onClick={handleGenerarPDFSocio}>
                      <FileText className="w-4 h-4 mr-2" /> PDF Socio
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-5 gap-2 mt-3">
            {[
              { label: 'Activos',   value: String(lote.animalesActivos) },
              { label: 'Vendidos',  value: String(lote.animalesVendidos) },
              { label: 'Invertido', value: formatColones(lote.totalInvertido) },
              { label: 'Gastos',    value: formatColones(lote.totalGastos) },
              { label: 'Utilidad',  value: formatColones(lote.utilidadTotal), color: lote.utilidadTotal >= 0 ? 'text-success' : 'text-destructive' },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-2 sm:p-3 flex flex-col items-center justify-center min-h-[56px] gap-0.5">
                  <div className={`font-extrabold text-xs sm:text-sm leading-tight text-center break-words w-full ${stat.color ?? 'text-foreground'}`}>{stat.value}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide text-center">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </header>

      {/* ── Tabs ── */}
      <div className="max-w-5xl mx-auto px-4">
        <Tabs value={tab} onValueChange={(v) => { setTab(v as Tab); setFilterText(''); setFiltro(FILTRO_VACIO); cancelarModo(); }}>
          <div className="sticky top-[var(--header-h,160px)] z-10 bg-background pt-3 pb-1">
            <TabsList className="w-full overflow-x-auto justify-start h-auto flex-wrap gap-1">
              <TabsTrigger value="animales" className="text-xs sm:text-sm">🐄 Animales ({animales.length})</TabsTrigger>
              <TabsTrigger value="gastos" className="text-xs sm:text-sm">💸 Gastos ({gastos.length})</TabsTrigger>
              <TabsTrigger value="ventas" className="text-xs sm:text-sm">💰 Ventas ({ventas.length})</TabsTrigger>
              <TabsTrigger value="pesos" className="text-xs sm:text-sm">⚖️ Pesos</TabsTrigger>
              <TabsTrigger value="sanidad" className="text-xs sm:text-sm">🩺 Sanidad ({eventos.length})</TabsTrigger>
              <TabsTrigger value="finanzas" className="text-xs sm:text-sm">💰 Finanzas</TabsTrigger>
            </TabsList>
          </div>

          {/* ── Tab Animales ── */}
          <TabsContent value="animales">
            {animales.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="text-4xl">🐄</div>
                <h3 className="font-semibold">Sin animales aún</h3>
                <p className="text-sm text-muted-foreground">Agregá el primer animal a este lote</p>
                <Button onClick={() => setShowAnimal(true)}><Plus className="w-4 h-4 mr-1" /> Agregar animal</Button>
              </div>
            ) : (
              <div className="space-y-3 py-3">
                {/* Search + selection toggle */}
                <div className="flex items-center gap-2">
                  {animalesActivos.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => modoSeleccion ? cancelarModo() : setModoSeleccion(true)}
                    >
                      {modoSeleccion ? 'Cancelar' : 'Seleccionar'}
                    </Button>
                  )}
                  <Input
                    type="search"
                    className="flex-1"
                    placeholder="Buscar por arete…"
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                  />
                </div>

                <AnimalesFilterBar filtro={filtro} onChange={setFiltro} razasDisponibles={razasDisponibles} />
                {animalesFiltrados.length !== animales.length && (
                  <p className="text-xs text-muted-foreground">
                    Mostrando {animalesFiltrados.length} de {animales.length}
                  </p>
                )}

                {animalesFiltrados.length === 0 ? (
                  <div className="text-center py-12 space-y-1">
                    <div className="text-3xl">🔍</div>
                    <h3 className="font-semibold">Sin resultados</h3>
                    <p className="text-sm text-muted-foreground">
                      {filterText
                        ? `No hay animales con arete "${filterText}"`
                        : 'No hay animales que coincidan con los filtros'}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Desktop table */}
                    <div className="hidden sm:block overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted text-muted-foreground">
                          <tr>
                            {modoSeleccion && <th className="w-8 px-3 py-2"></th>}
                            <th className="px-3 py-2 text-left">Arete</th>
                            <th className="px-3 py-2 text-left">Raza</th>
                            <th className="px-3 py-2 text-left">Peso ini.</th>
                            <th className="px-3 py-2 text-left">Peso act.</th>
                            <th className="px-3 py-2 text-left">Ganancia</th>
                            <th className="px-3 py-2 text-left">Precio</th>
                            <th className="px-3 py-2 text-left">Estado</th>
                            <th className="px-3 py-2"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {animalesFiltrados.map((animal) => {
                            const ganancia = animal.pesoActual - animal.pesoInicial;
                            return (
                              <tr key={animal.id} className="hover:bg-muted/50">
                                {modoSeleccion && (
                                  <td className="px-3 py-2">
                                    {animal.estado === 'activo' && (
                                      <input
                                        type="checkbox"
                                        checked={seleccionados.has(animal.id)}
                                        onChange={() => toggleSeleccion(animal.id)}
                                        className="cursor-pointer accent-primary"
                                      />
                                    )}
                                  </td>
                                )}
                                <td className="px-3 py-2">
                                  <strong>{animal.numeroArete}</strong>
                                  {animal.estado === 'activo' && !animal.areteSenasa && (
                                    <span className="ml-1.5 text-xs text-amber-600" title="Sin arete SENASA">⚠️</span>
                                  )}
                                  {animal.areteSenasa && (
                                    <span className="block text-[10px] text-muted-foreground">DIIO: {animal.areteSenasa}</span>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  {animal.raza}
                                  {animal.origen && animal.origen !== 'comprado' && (
                                    <span className="ml-1.5 text-[10px] text-muted-foreground">
                                      ({animal.origen === 'nacido_finca' ? 'nacido' : 'sin reg.'})
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2">{formatKg(animal.pesoInicial)}</td>
                                <td className="px-3 py-2">{formatKg(animal.pesoActual)}</td>
                                <td className={`px-3 py-2 ${ganancia >= 0 ? 'text-success' : 'text-destructive'}`}>
                                  {ganancia >= 0 ? '+' : ''}{formatKg(ganancia)}
                                </td>
                                <td className="px-3 py-2">{formatColones(animal.precioCompra)}</td>
                                <td className="px-3 py-2">
                                  <Badge variant={animal.estado === 'activo' ? 'default' : 'secondary'} className="text-xs">
                                    {animal.estado}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2">
                                  {animal.estado === 'muerto' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => setRevertMuerteAnimal(animal)}
                                    >
                                      Revertir muerte
                                    </Button>
                                  )}
                                  {animal.estado === 'activo' && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                          <MoreVertical className="w-3.5 h-3.5" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => { setAnimalPeso(animal); setShowPeso(true); }}>
                                          <Scale className="w-4 h-4 mr-2" /> Registrar peso
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => { setSanidadAnimalInicial(animal.id); setShowSanidad(true); }}>
                                          🩺 Evento sanitario
                                        </DropdownMenuItem>
                                        {!modoSeleccion && (
                                          <DropdownMenuItem onClick={() => abrirMoverModal([animal])}>
                                            ↗ Mover a otro lote
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => setEditAnimal(animal)}>
                                          <Pencil className="w-4 h-4 mr-2" /> Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          className="text-destructive"
                                          onClick={() => setMuerteAnimal(animal)}
                                        >
                                          💀 Registrar muerte
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          className="text-destructive"
                                          onClick={() => setDeleteAnimal(animal)}
                                        >
                                          <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="sm:hidden space-y-2">
                      {animalesFiltrados.map((animal) => {
                        const ganancia = animal.pesoActual - animal.pesoInicial;
                        return (
                          <Card
                            key={animal.id}
                            className={`cursor-default ${modoSeleccion && animal.estado === 'activo' ? 'cursor-pointer' : ''} ${seleccionados.has(animal.id) ? 'border-primary bg-primary/10' : ''}`}
                            onClick={modoSeleccion && animal.estado === 'activo' ? () => toggleSeleccion(animal.id) : undefined}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-sm">
                                  {animal.numeroArete}
                                  {animal.estado === 'activo' && !animal.areteSenasa && (
                                    <span className="ml-1 text-xs text-amber-600" title="Sin arete SENASA">⚠️</span>
                                  )}
                                </span>
                                <Badge variant={animal.estado === 'activo' ? 'default' : 'secondary'} className="text-xs">
                                  {animal.estado}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                <span className="text-muted-foreground">Raza</span>
                                <span>
                                  <strong>{animal.raza}</strong>
                                  {animal.origen && animal.origen !== 'comprado' && (
                                    <span className="ml-1 text-[10px] text-muted-foreground">
                                      ({animal.origen === 'nacido_finca' ? 'nacido' : 'sin reg.'})
                                    </span>
                                  )}
                                </span>
                                <span className="text-muted-foreground">Precio</span><span>{formatColones(animal.precioCompra)}</span>
                                <span className="text-muted-foreground">Peso ini.</span><span>{formatKg(animal.pesoInicial)}</span>
                                <span className="text-muted-foreground">Peso act.</span><span>{formatKg(animal.pesoActual)}</span>
                                <span className="text-muted-foreground">Ganancia</span>
                                <span className={ganancia >= 0 ? 'text-success' : 'text-destructive'}>
                                  {ganancia >= 0 ? '+' : ''}{formatKg(ganancia)}
                                </span>
                              </div>
                              {animal.estado === 'activo' && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {!modoSeleccion && (
                                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); abrirMoverModal([animal]); }}>
                                      ↗ Mover
                                    </Button>
                                  )}
                                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); setSanidadAnimalInicial(animal.id); setShowSanidad(true); }}>🩺</Button>
                                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); setAnimalPeso(animal); setShowPeso(true); }}>⚖️</Button>
                                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); setEditAnimal(animal); }}><Pencil className="w-3 h-3" /></Button>
                                  <Button variant="outline" size="sm" className="h-7 text-xs text-destructive" onClick={(e) => { e.stopPropagation(); setMuerteAnimal(animal); }}>💀</Button>
                                  <Button variant="outline" size="sm" className="h-7 text-xs text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteAnimal(animal); }}><Trash2 className="w-3 h-3" /></Button>
                                </div>
                              )}
                              {animal.estado === 'muerto' && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); setRevertMuerteAnimal(animal); }}>
                                    Revertir muerte
                                  </Button>
                                </div>
                              )}
                              {/* Historial sanitario individual */}
                              {(() => {
                                const eventosAnimal = eventos.filter(e => e.animalId === animal.id);
                                if (eventosAnimal.length === 0) return null;
                                return (
                                  <div className="mt-2 pt-2 border-t border-border">
                                    <p className="text-xs font-medium mb-1">🩺 Historial individual</p>
                                    {eventosAnimal.slice(0, 3).map(e => (
                                      <div key={e.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <span>{e.tipo === 'vacuna' ? '💉' : e.tipo === 'tratamiento' ? '💊' : e.tipo === 'desparasitante' ? '🔬' : e.tipo === 'vitamina' ? '🌿' : '➕'}</span>
                                        <span>{e.nombreProducto}</span>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── Tab Gastos ── */}
          <TabsContent value="gastos">
            {gastos.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="text-4xl">💸</div>
                <h3 className="font-semibold">Sin gastos registrados</h3>
                <p className="text-sm text-muted-foreground">Registrá los gastos de alimento, veterinario, etc.</p>
                <Button onClick={() => setShowGasto(true)}><Plus className="w-4 h-4 mr-1" /> Agregar gasto</Button>
              </div>
            ) : (
              <div className="py-3 overflow-x-auto rounded-lg border border-border mt-3">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Fecha</th>
                      <th className="px-3 py-2 text-left">Concepto</th>
                      <th className="px-3 py-2 text-left">Tipo</th>
                      <th className="px-3 py-2 text-left">Quién pagó</th>
                      <th className="px-3 py-2 text-left">Monto</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))]">
                    {gastos.map((g) => (
                      <tr key={g.id} className="hover:bg-muted/50">
                        <td className="px-3 py-2 whitespace-nowrap">{formatFecha(g.fecha)}</td>
                        <td className="px-3 py-2">
                          <span className="flex items-center gap-1.5">
                            {g.concepto}
                            {g.gastoFincaId && <Badge variant="outline" className="text-xs">📌 Finca</Badge>}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant="secondary" className="text-xs">{g.tipo.replace('_', ' ')}</Badge>
                        </td>
                        <td className="px-3 py-2">{g.quienPago || '—'}</td>
                        <td className="px-3 py-2"><strong>{formatColones(g.monto)}</strong></td>
                        <td className="px-3 py-2">
                          {!g.gastoFincaId && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditGasto(g)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => setDeleteGasto(g)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-muted/30">
                      <td colSpan={4} className="px-3 py-2 text-right font-semibold">TOTAL</td>
                      <td className="px-3 py-2">
                        <strong className="text-destructive">
                          {formatColones(gastos.reduce((s, g) => s + g.monto, 0))}
                        </strong>
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ── Tab Ventas ── */}
          <TabsContent value="ventas">
            {ventas.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="text-4xl">💰</div>
                <h3 className="font-semibold">Sin ventas registradas</h3>
                <p className="text-sm text-muted-foreground">Cuando vendás animales, el registro aparecerá aquí</p>
              </div>
            ) : (
              <div className="space-y-3 py-3">
                {ventas.map((v) => (
                  <Card key={v.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">
                          <strong>{v.cantidadAnimales} animal{v.cantidadAnimales !== 1 ? 'es' : ''}</strong> — {formatFecha(v.fecha)}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge variant={v.utilidadBruta >= 0 ? 'default' : 'destructive'} className="text-xs">
                            {v.utilidadBruta >= 0 ? '+' : ''}{formatColones(v.utilidadBruta)}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-destructive"
                            onClick={() => setDeleteVenta(v)}
                          >
                            Anular
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <span className="text-muted-foreground">Inversión</span><span>{formatColones(v.totalInversion)}</span>
                        <span className="text-muted-foreground">Gastos prop.</span><span>{formatColones(v.gastosProporcion)}</span>
                        <span className="text-muted-foreground">Venta total</span><span>{formatColones(v.totalVenta)}</span>
                        {v.utilidadSocio !== null && v.utilidadSocio !== undefined && lote.socio && (
                          <>
                            <span className="text-muted-foreground">Utilidad {lote.socio.nombre}</span>
                            <span className="text-success">{formatColones(v.utilidadSocio)}</span>
                            <span className="text-muted-foreground">Tu utilidad</span>
                            <span className="text-success">{formatColones(v.utilidadPropietario ?? 0)}</span>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Tab Pesos ── */}
          <TabsContent value="pesos">
            {fincaActiva
              ? <PesosTab lote={lote} animales={animales} finca={fincaActiva} />
              : <p className="text-sm text-muted-foreground py-8">Cargando finca...</p>
            }
          </TabsContent>

          {/* ── Tab Sanidad ── */}
          <TabsContent value="sanidad">
            <SanidadTab
              eventos={eventos}
              loading={loadingEventos}
              animalesMap={animalesMap}
              onNuevo={() => { setSanidadAnimalInicial(undefined); setShowSanidad(true); }}
              onEliminar={setEventoToDelete}
              deletingId={deletingEventoId}
            />
          </TabsContent>

          <TabsContent value="finanzas">
            {lote && <FinanzasLoteTab lote={lote} animales={animales} ventas={ventas} />}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Barra multi-select ── */}
      {modoSeleccion && seleccionados.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-background border-t border-border px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
          <span className="text-sm font-medium">
            {seleccionados.size} animal{seleccionados.size !== 1 ? 'es' : ''} seleccionado{seleccionados.size !== 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                const sel = animalesActivos.filter((a) => seleccionados.has(a.id));
                abrirMoverModal(sel);
              }}
            >
              Mover
            </Button>
            <Button variant="outline" size="sm" onClick={cancelarModo}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* ── Modal registrar muerte ── */}
      {muerteAnimal && (
        <RegistrarMuerteModal
          animal={muerteAnimal}
          onClose={() => setMuerteAnimal(null)}
        />
      )}

      {/* ── Confirmar revertir muerte ── */}
      {revertMuerteAnimal && (
        <ConfirmarBorradoModal
          titulo={`¿Revertir la muerte de ${revertMuerteAnimal.numeroArete}?`}
          descripcion="El animal volverá a estado activo y la pérdida registrada será revertida en la utilidad del lote."
          labelConfirmar="Revertir muerte"
          loading={deletingId === revertMuerteAnimal.id}
          onConfirm={handleRevertMuerte}
          onClose={() => setRevertMuerteAnimal(null)}
        />
      )}

      {/* ── Modal mover animales ── */}
      {animalesAMover.length > 0 && lote && (
        <MoverAnimalesModal
          animales={animalesAMover}
          loteSrc={lote}
          todosLosLotes={todosLosLotes}
          fincas={fincas}
          onClose={() => setAnimalesAMover([])}
          onSuccess={cancelarModo}
        />
      )}

      {/* ── Modales de creación ── */}
      {showAnimal && loteId && <AgregarAnimalModal fincaId={lote?.fincaId ?? ''} loteId={loteId} onClose={() => setShowAnimal(false)} />}
      {showGasto && loteId && <AgregarGastoModal fincaId={lote?.fincaId ?? ''} loteId={loteId} onClose={() => setShowGasto(false)} />}
      {showPeso && animalPeso && loteId && (
        <RegistrarPesoModal fincaId={lote?.fincaId ?? ''} animal={animalPeso} loteId={loteId} onClose={() => { setShowPeso(false); setAnimalPeso(null); }} />
      )}
      {showVenta && lote && (
        <VenderAnimalesModal fincaId={lote.fincaId ?? ''} lote={lote} animalesActivos={animalesActivos} gastos={gastos} onClose={() => setShowVenta(false)} />
      )}

      {/* ── Modales de edición ── */}
      {editAnimal && loteId && (
        <AgregarAnimalModal fincaId={lote?.fincaId ?? ''} loteId={loteId} editData={editAnimal} onClose={() => setEditAnimal(null)} />
      )}
      {editGasto && loteId && (
        <AgregarGastoModal fincaId={lote?.fincaId ?? ''} loteId={loteId} editData={editGasto} onClose={() => setEditGasto(null)} />
      )}

      {/* ── Modales de confirmación de borrado ── */}
      {deleteAnimal && (
        <ConfirmarBorradoModal
          titulo={`¿Eliminar animal ${deleteAnimal.numeroArete}?`}
          descripcion="Se eliminarán también todos sus pesajes registrados."
          loading={deletingId === deleteAnimal.id}
          onConfirm={handleDeleteAnimal}
          onClose={() => setDeleteAnimal(null)}
        />
      )}
      {deleteGasto && (
        <ConfirmarBorradoModal
          titulo="¿Eliminar este gasto?"
          descripcion={`${deleteGasto.concepto} — ${formatColones(deleteGasto.monto)}`}
          loading={deletingId === deleteGasto.id}
          onConfirm={handleDeleteGasto}
          onClose={() => setDeleteGasto(null)}
        />
      )}
      {deleteVenta && (
        <ConfirmarBorradoModal
          titulo="¿Anular esta venta?"
          descripcion="Los animales volverán a estado activo y los contadores del lote serán revertidos. Esta acción no se puede deshacer."
          labelConfirmar="Anular venta"
          loading={deletingId === deleteVenta.id}
          onConfirm={handleAnularVenta}
          onClose={() => setDeleteVenta(null)}
        />
      )}

      {showSanidad && lote && fincaActiva && (
        <EventoSanitarioModal
          loteId={lote.id}
          fincaId={fincaActiva.id}
          animales={animales}
          animalIdInicial={sanidadAnimalInicial}
          onClose={() => { setShowSanidad(false); setSanidadAnimalInicial(undefined); }}
        />
      )}

      {eventoToDelete && (
        <ConfirmarBorradoModal
          titulo={`¿Eliminar el evento "${eventoToDelete.nombreProducto}"?`}
          descripcion="Se revertirá el gasto del lote."
          loading={deletingEventoId === eventoToDelete.id}
          onConfirm={confirmarEliminarEvento}
          onClose={() => setEventoToDelete(null)}
        />
      )}
    </div>
  );
}
