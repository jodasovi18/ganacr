import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLote } from '@/hooks/useLotes';
import { useAnimales, useEliminarAnimal } from '@/hooks/useAnimales';
import { useGastos, useEliminarGasto } from '@/hooks/useGastos';
import { useVentas, useAnularVenta } from '@/hooks/useVentas';
import { formatColones, formatKg, formatFecha } from '@/utils/calculadora';
import AgregarAnimalModal from '@/components/AgregarAnimalModal';
import AgregarGastoModal from '@/components/AgregarGastoModal';
import RegistrarPesoModal from '@/components/RegistrarPesoModal';
import VenderAnimalesModal from '@/components/VenderAnimalesModal';
import ConfirmarBorradoModal from '@/components/ConfirmarBorradoModal';
import { useFinca } from '@/contexts/FincaContext';
import PesosTab from '@/components/PesosTab';
import { Animal, Gasto, Venta } from '@/types';
import './LoteDetalle.css';

type Tab = 'animales' | 'gastos' | 'ventas' | 'pesos';

export default function LoteDetalle() {
  const { loteId } = useParams<{ loteId: string }>();
  const { lote, loading } = useLote(loteId ?? null);
  const { animales } = useAnimales(loteId ?? null);
  const { gastos } = useGastos(loteId ?? null);
  const { ventas } = useVentas(loteId ?? null);
  const navigate = useNavigate();
  const { fincaActiva } = useFinca();

  const { eliminarAnimal } = useEliminarAnimal();
  const { eliminarGasto } = useEliminarGasto();
  const { anularVenta } = useAnularVenta();

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');

  if (loading) return <div className="loading-container"><div className="loading-spinner" /></div>;
  if (!lote) return <div className="container page-content"><p>Lote no encontrado.</p></div>;

  const animalesActivos = animales.filter((a) => a.estado === 'activo');
  const animalesFiltrados = animales.filter((a) =>
    a.numeroArete.toLowerCase().includes(filterText.toLowerCase())
  );

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

  return (
    <div className="lote-detalle-page">
      {/* Header */}
      <header className="detalle-header">
        <div className="container">
          <button className="btn btn-ghost btn-sm mb-2" onClick={() => navigate('/')}>
            ← Volver
          </button>
          <div className="flex-between flex-wrap gap-2">
            <div>
              <h1 className="detalle-titulo">{lote.nombreLote}</h1>
              {lote.tipoPropiedad === 'medias' && lote.socio && (
                <p className="detalle-socio">🤝 A medias con <strong>{lote.socio.nombre}</strong> ({lote.socio.porcentaje}% / {100 - lote.socio.porcentaje}%)</p>
              )}
              <p className="text-muted" style={{ fontSize: '0.82rem' }}>Compra: {formatFecha(lote.fechaCompra)}</p>
            </div>
            <div className="detalle-acciones">
              <button className="btn btn-primary btn-sm" onClick={() => setShowAnimal(true)}>+ Animal</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowGasto(true)}>+ Gasto</button>
              {animalesActivos.length > 0 && (
                <button className="btn btn-secondary btn-sm" onClick={() => setShowVenta(true)}>💰 Vender</button>
              )}
            </div>
          </div>

          <div className="stats-grid mt-2">
            <div className="stat-card"><div className="stat-value">{lote.animalesActivos}</div><div className="stat-label">Activos</div></div>
            <div className="stat-card"><div className="stat-value">{lote.animalesVendidos}</div><div className="stat-label">Vendidos</div></div>
            <div className="stat-card"><div className="stat-value">{formatColones(lote.totalInvertido)}</div><div className="stat-label">Invertido</div></div>
            <div className="stat-card"><div className="stat-value">{formatColones(lote.totalGastos)}</div><div className="stat-label">Gastos</div></div>
            <div className="stat-card">
              <div className={`stat-value ${lote.utilidadTotal >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatColones(lote.utilidadTotal)}
              </div>
              <div className="stat-label">Utilidad</div>
            </div>
          </div>
        </div>
      </header>

      {/* Sticky Tabs */}
      <div className="tabs-sticky">
        <div className="container">
          <div className="tabs mt-2">
            {(['animales', 'gastos', 'ventas', 'pesos'] as Tab[]).map((t) => (
              <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => { setTab(t); setFilterText(''); }}>
                {t === 'animales' && `🐄 Animales (${animales.length})`}
                {t === 'gastos' && `💸 Gastos (${gastos.length})`}
                {t === 'ventas' && `💰 Ventas (${ventas.length})`}
                {t === 'pesos' && `⚖️ Pesos`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container">
        <div className="tab-content page-content">
          {/* ── Tab Animales ── */}
          {tab === 'animales' && (
            animales.length === 0 ? (
              <div className="empty-state">
                <div className="emoji">🐄</div>
                <h3>Sin animales aún</h3>
                <p>Agregá el primer animal a este lote</p>
                <button className="btn btn-primary" onClick={() => setShowAnimal(true)}>+ Agregar animal</button>
              </div>
            ) : (
              <>
                {/* Arete search */}
                <div className="arete-search-wrap">
                  <input
                    type="search"
                    className="form-input arete-search"
                    placeholder="Buscar por arete…"
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                  />
                </div>

                {animalesFiltrados.length === 0 ? (
                  <div className="empty-state">
                    <div className="emoji">🔍</div>
                    <h3>Sin resultados</h3>
                    <p>No hay animales con arete "{filterText}"</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop: tabla */}
                    <div className="table-wrap animals-table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Arete</th>
                            <th>Raza</th>
                            <th>Peso inicial</th>
                            <th>Peso actual</th>
                            <th>Ganancia</th>
                            <th>Precio compra</th>
                            <th>Estado</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {animalesFiltrados.map((animal) => {
                            const ganancia = animal.pesoActual - animal.pesoInicial;
                            return (
                              <tr key={animal.id}>
                                <td><strong>{animal.numeroArete}</strong></td>
                                <td>{animal.raza}</td>
                                <td>{formatKg(animal.pesoInicial)}</td>
                                <td>{formatKg(animal.pesoActual)}</td>
                                <td className={ganancia >= 0 ? 'text-success' : 'text-danger'}>
                                  {ganancia >= 0 ? '+' : ''}{formatKg(ganancia)}
                                </td>
                                <td>{formatColones(animal.precioCompra)}</td>
                                <td>
                                  <span className={`badge ${animal.estado === 'activo' ? 'badge-green' : animal.estado === 'vendido' ? 'badge-yellow' : 'badge-red'}`}>
                                    {animal.estado}
                                  </span>
                                </td>
                                <td>
                                  <div className="flex gap-1">
                                    {animal.estado === 'activo' && (
                                      <>
                                        <button className="btn btn-ghost btn-sm" title="Registrar peso" onClick={() => { setAnimalPeso(animal); setShowPeso(true); }}>
                                          ⚖️
                                        </button>
                                        <button className="btn btn-ghost btn-sm" title="Editar animal" onClick={() => setEditAnimal(animal)}>
                                          ✏️
                                        </button>
                                        <button
                                          className="btn btn-ghost btn-sm"
                                          title="Eliminar animal"
                                          style={{ color: 'var(--color-danger, #dc3545)' }}
                                          onClick={() => setDeleteAnimal(animal)}
                                        >
                                          🗑️
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile: cards */}
                    <div className="animals-cards">
                      {animalesFiltrados.map((animal) => {
                        const ganancia = animal.pesoActual - animal.pesoInicial;
                        return (
                          <div key={animal.id} className="animal-card">
                            <div className="animal-card-header">
                              <span className="animal-card-arete">{animal.numeroArete}</span>
                              <span className={`badge ${animal.estado === 'activo' ? 'badge-green' : animal.estado === 'vendido' ? 'badge-yellow' : 'badge-red'}`}>
                                {animal.estado}
                              </span>
                            </div>
                            <div className="animal-card-data">
                              <span>Raza: <strong>{animal.raza}</strong></span>
                              <span>Precio: <strong>{formatColones(animal.precioCompra)}</strong></span>
                              <span>Peso ini: <strong>{formatKg(animal.pesoInicial)}</strong></span>
                              <span>Peso act: <strong>{formatKg(animal.pesoActual)}</strong></span>
                              <span className={ganancia >= 0 ? 'text-success' : 'text-danger'}>
                                Ganancia: <strong>{ganancia >= 0 ? '+' : ''}{formatKg(ganancia)}</strong>
                              </span>
                            </div>
                            {animal.estado === 'activo' && (
                              <div className="animal-card-actions">
                                <button className="btn btn-ghost btn-sm" title="Registrar peso" onClick={() => { setAnimalPeso(animal); setShowPeso(true); }}>⚖️</button>
                                <button className="btn btn-ghost btn-sm" title="Editar" onClick={() => setEditAnimal(animal)}>✏️</button>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  title="Eliminar"
                                  style={{ color: 'var(--color-danger, #dc3545)' }}
                                  onClick={() => setDeleteAnimal(animal)}
                                >🗑️</button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )
          )}

          {/* ── Tab Gastos ── */}
          {tab === 'gastos' && (
            gastos.length === 0 ? (
              <div className="empty-state">
                <div className="emoji">💸</div>
                <h3>Sin gastos registrados</h3>
                <p>Registrá los gastos de alimento, veterinario, etc.</p>
                <button className="btn btn-primary" onClick={() => setShowGasto(true)}>+ Agregar gasto</button>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Fecha</th><th>Concepto</th><th>Tipo</th><th>Quién pagó</th><th>Monto</th><th></th></tr>
                  </thead>
                  <tbody>
                    {gastos.map((g) => (
                      <tr key={g.id}>
                        <td>{formatFecha(g.fecha)}</td>
                        <td>{g.concepto}</td>
                        <td><span className="badge badge-gray">{g.tipo.replace('_', ' ')}</span></td>
                        <td>{g.quienPago || '—'}</td>
                        <td><strong>{formatColones(g.monto)}</strong></td>
                        <td>
                          <div className="flex gap-1">
                            <button className="btn btn-ghost btn-sm" title="Editar gasto" onClick={() => setEditGasto(g)}>✏️</button>
                            <button
                              className="btn btn-ghost btn-sm"
                              title="Eliminar gasto"
                              style={{ color: 'var(--color-danger, #dc3545)' }}
                              onClick={() => setDeleteGasto(g)}
                            >🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={4} className="text-right"><strong>TOTAL</strong></td>
                      <td><strong className="text-danger">{formatColones(gastos.reduce((s, g) => s + g.monto, 0))}</strong></td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ── Tab Ventas ── */}
          {tab === 'ventas' && (
            ventas.length === 0 ? (
              <div className="empty-state">
                <div className="emoji">💰</div>
                <h3>Sin ventas registradas</h3>
                <p>Cuando vendás animales, el registro aparecerá aquí</p>
              </div>
            ) : (
              <div className="ventas-list">
                {ventas.map((v) => (
                  <div key={v.id} className="venta-card card mb-2">
                    <div className="flex-between mb-1">
                      <span><strong>{v.cantidadAnimales} animal{v.cantidadAnimales !== 1 ? 'es' : ''}</strong> — {formatFecha(v.fecha)}</span>
                      <div className="flex gap-1" style={{ alignItems: 'center' }}>
                        <span className={`badge ${v.utilidadBruta >= 0 ? 'badge-green' : 'badge-red'}`}>
                          {v.utilidadBruta >= 0 ? '+' : ''}{formatColones(v.utilidadBruta)}
                        </span>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--color-danger, #dc3545)', fontSize: '0.78rem' }}
                          onClick={() => setDeleteVenta(v)}
                        >
                          Anular
                        </button>
                      </div>
                    </div>
                    <div className="venta-detalle">
                      <div><span>Inversión</span><span>{formatColones(v.totalInversion)}</span></div>
                      <div><span>Gastos prop.</span><span>{formatColones(v.gastosProporcion)}</span></div>
                      <div><span>Venta total</span><span>{formatColones(v.totalVenta)}</span></div>
                      {v.utilidadSocio !== null && v.utilidadSocio !== undefined && lote.socio && (
                        <>
                          <div><span>Utilidad {lote.socio.nombre}</span><span className="text-success">{formatColones(v.utilidadSocio)}</span></div>
                          <div><span>Tu utilidad</span><span className="text-success">{formatColones(v.utilidadPropietario ?? 0)}</span></div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── Tab Pesos ── */}
          {tab === 'pesos' && fincaActiva && (
            <PesosTab
              lote={lote}
              animales={animales}
              finca={fincaActiva}
            />
          )}
        </div>
      </div>

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
    </div>
  );
}
