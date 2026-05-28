import { useMemo, useState } from 'react';
import { Animal, Finca, Lote, Peso } from '@/types';
import { formatKg, formatFecha } from '@/utils/calculadora';
import { usePesosLote } from '@/hooks/usePesosLote';
import LoteAvgChart, { calcularLoteAvgData } from '@/components/svg/LoteAvgChart';
import AnimalPesoModal from '@/components/AnimalPesoModal';
import './PesosTab.css';

const DEFAULT_UMBRAL_AMARILLO = 15;
const DEFAULT_UMBRAL_ROJO = 30;

type SemaforoStatus = '🔴' | '🟡' | '🟢' | '⚪';

interface AnimalConSemaforo {
  animal: Animal;
  status: SemaforoStatus;
  diasSinPesar: number | null;
  ultimoPeso: Peso | null;
}

function getSemaforoStatus(
  diasSinPesar: number | null,
  amarillo: number,
  rojo: number
): SemaforoStatus {
  if (diasSinPesar === null) return '⚪';
  if (diasSinPesar > rojo) return '🔴';
  if (diasSinPesar > amarillo) return '🟡';
  return '🟢';
}

const STATUS_ORDER: Record<SemaforoStatus, number> = {
  '🔴': 0, '⚪': 1, '🟡': 2, '🟢': 3,
};

interface Props {
  lote: Lote;
  animales: Animal[];
  finca: Finca;
}

export default function PesosTab({ lote, animales, finca }: Props) {
  const { pesos, loading } = usePesosLote(lote.id);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);

  const umbralAmarillo = finca.pesoUmbralAmarillo ?? DEFAULT_UMBRAL_AMARILLO;
  const umbralRojo = finca.pesoUmbralRojo ?? DEFAULT_UMBRAL_ROJO;

  // ── Latest peso per animal ─────────────────────────────────────────────────
  const ultimoPorAnimal = useMemo(() => {
    const map = new Map<string, Peso>();
    // pesos come desc → first one per animalId is the latest
    for (const p of pesos) {
      if (!map.has(p.animalId)) map.set(p.animalId, p);
    }
    return map;
  }, [pesos]);

  // ── Semáforo list ──────────────────────────────────────────────────────────
  const animalesConSemaforo: AnimalConSemaforo[] = useMemo(() => {
    const hoy = Date.now();
    return animales
      .filter((a) => a.estado === 'activo')
      .map((animal) => {
        const ultimoPeso = ultimoPorAnimal.get(animal.id) ?? null;
        const diasSinPesar = ultimoPeso
          ? Math.floor((hoy - new Date(ultimoPeso.fecha).getTime()) / 86_400_000)
          : null;
        const status = getSemaforoStatus(diasSinPesar, umbralAmarillo, umbralRojo);
        return { animal, status, diasSinPesar, ultimoPeso };
      })
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  }, [animales, ultimoPorAnimal, umbralAmarillo, umbralRojo]);

  // ── Lote average chart data ────────────────────────────────────────────────
  const avgData = useMemo(() => calcularLoteAvgData(pesos), [pesos]);

  // ── Computed lote average (for passing to AnimalPesoModal) ────────────────
  // Derived from animal.pesoActual counters (same source as lote.pesoPromedio),
  // not from the pesos collection snapshot. This is intentional: the counter is
  // always in sync with the latest registered weight and avoids an extra query.
  const pesoPromedioLote = useMemo(() => {
    const activos = animales.filter((a) => a.estado === 'activo');
    if (activos.length === 0) return 0;
    return activos.reduce((s, a) => s + a.pesoActual, 0) / activos.length;
  }, [animales]);

  // ── Alert counts ───────────────────────────────────────────────────────────
  const countRojo = animalesConSemaforo.filter((a) => a.status === '🔴').length;
  // animalesConSemaforo already filters activos — reuse its length for the label
  const animalesActivos = animalesConSemaforo;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (animalesActivos.length === 0) {
    return (
      <div className="pesos-empty">
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚖️</div>
        <p>No hay animales activos en este lote.</p>
      </div>
    );
  }

  return (
    <>
      <div className="tab-content page-content">
        {/* ── Alert banner ── */}
        {countRojo > 0 && (
          <div className="pesos-alert-banner">
            <span className="pesos-alert-icon">🔴</span>
            <div>
              <div className="pesos-alert-text">
                {countRojo} animal{countRojo !== 1 ? 'es' : ''} sin pesar en más de {umbralRojo} días
              </div>
              <div className="pesos-alert-sub">Tocá el animal para registrar un pesaje</div>
            </div>
          </div>
        )}

        {/* ── Lote avg chart ── */}
        <div className="pesos-avg-card">
          <div className="pesos-avg-header">
            <span className="pesos-avg-title">Promedio del lote</span>
            {avgData.length >= 2 && (
              <span className="pesos-avg-badge">
                {avgData[avgData.length - 1].promedio > avgData[0].promedio ? '↑' : '↓'}
                {' '}{formatKg(Math.abs(avgData[avgData.length - 1].promedio - avgData[0].promedio))} total
              </span>
            )}
          </div>
          <LoteAvgChart data={avgData} />
        </div>

        {/* ── Semáforo list ── */}
        <p className="pesos-section-label">
          Estado de pesaje — {animalesActivos.length} animales activos
        </p>
        <div className="pesos-animal-list">
          {animalesConSemaforo.map(({ animal, status, diasSinPesar, ultimoPeso }) => (
            <div
              key={animal.id}
              className={`pesos-animal-row${status === '🔴' ? ' row-red' : ''}`}
              onClick={() => setSelectedAnimal(animal)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedAnimal(animal)}
            >
              <span className="pesos-semaforo">{status}</span>
              <div className="pesos-animal-info">
                <div className="pesos-animal-nombre">
                  {animal.numeroArete} — {animal.raza}
                </div>
                <div className={`pesos-animal-dias${status === '🔴' ? ' dias-red' : status === '🟡' ? ' dias-yellow' : ''}`}>
                  {diasSinPesar === null
                    ? 'Sin pesajes'
                    : diasSinPesar === 0
                    ? 'Pesado hoy'
                    : `Hace ${diasSinPesar} día${diasSinPesar !== 1 ? 's' : ''}`
                  }
                  {ultimoPeso && ` · ${formatFecha(ultimoPeso.fecha)}`}
                </div>
              </div>
              <span className="pesos-animal-peso">{formatKg(animal.pesoActual)}</span>
              <span className="pesos-animal-arrow">›</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Animal detail modal ── */}
      {selectedAnimal && (
        <AnimalPesoModal
          animal={selectedAnimal}
          lote={lote}
          pesoPromedioLote={pesoPromedioLote}
          onClose={() => setSelectedAnimal(null)}
        />
      )}
    </>
  );
}
