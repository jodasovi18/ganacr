import { useMemo, useState } from 'react';
import { Animal, Finca, Lote, Peso } from '@/types';
import { formatKg, formatFecha } from '@/utils/calculadora';
import { usePesosLote } from '@/hooks/usePesosLote';
import LoteAvgChart, { calcularLoteAvgData } from '@/components/svg/LoteAvgChart';
import AnimalPesoModal from '@/components/AnimalPesoModal';

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

  const ultimoPorAnimal = useMemo(() => {
    const map = new Map<string, Peso>();
    for (const p of pesos) {
      if (!map.has(p.animalId)) map.set(p.animalId, p);
    }
    return map;
  }, [pesos]);

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

  const avgData = useMemo(() => calcularLoteAvgData(pesos), [pesos]);

  const pesoPromedioLote = useMemo(() => {
    const activos = animales.filter((a) => a.estado === 'activo');
    if (activos.length === 0) return 0;
    return activos.reduce((s, a) => s + a.pesoActual, 0) / activos.length;
  }, [animales]);

  const countRojo = animalesConSemaforo.filter((a) => a.status === '🔴').length;
  const animalesActivos = animalesConSemaforo;

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (animalesActivos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-3xl mb-2">⚖️</div>
        <p className="text-muted-foreground text-sm">No hay animales activos en este lote.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 py-4">
        {/* ── Alert banner ── */}
        {countRojo > 0 && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 p-3">
            <span className="text-lg">🔴</span>
            <div>
              <div className="text-sm font-medium text-red-800 dark:text-red-300">
                {countRojo} animal{countRojo !== 1 ? 'es' : ''} sin pesar en más de {umbralRojo} días
              </div>
              <div className="text-xs text-red-600 dark:text-red-400 mt-0.5">Tocá el animal para registrar un pesaje</div>
            </div>
          </div>
        )}

        {/* ── Lote avg chart ── */}
        <div className="rounded-lg border border-border p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Promedio del lote</span>
            {avgData.length >= 2 && (
              <span className="text-xs text-muted-foreground">
                {avgData[avgData.length - 1].promedio > avgData[0].promedio ? '↑' : '↓'}
                {' '}{formatKg(Math.abs(avgData[avgData.length - 1].promedio - avgData[0].promedio))} total
              </span>
            )}
          </div>
          <LoteAvgChart data={avgData} />
        </div>

        {/* ── Semáforo list ── */}
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Estado de pesaje — {animalesActivos.length} animales activos
        </p>
        <div className="space-y-1">
          {animalesConSemaforo.map(({ animal, status, diasSinPesar, ultimoPeso }) => (
            <div
              key={animal.id}
              className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors hover:bg-muted ${
                status === '🔴' ? 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20' : 'border-border'
              }`}
              onClick={() => setSelectedAnimal(animal)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedAnimal(animal)}
            >
              <span className="text-lg">{status}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {animal.numeroArete} — {animal.raza}
                </div>
                <div className={`text-xs mt-0.5 ${
                  status === '🔴' ? 'text-red-600 dark:text-red-400' :
                  status === '🟡' ? 'text-amber-600 dark:text-amber-400' :
                  'text-muted-foreground'
                }`}>
                  {diasSinPesar === null
                    ? 'Sin pesajes'
                    : diasSinPesar === 0
                    ? 'Pesado hoy'
                    : `Hace ${diasSinPesar} día${diasSinPesar !== 1 ? 's' : ''}`
                  }
                  {ultimoPeso && ` · ${formatFecha(ultimoPeso.fecha)}`}
                </div>
              </div>
              <span className="text-sm font-semibold">{formatKg(animal.pesoActual)}</span>
              <span className="text-muted-foreground">›</span>
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
