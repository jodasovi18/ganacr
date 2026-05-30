import { useState } from 'react';
import { Animal, Lote } from '@/types';
import { usePesos } from '@/hooks/usePesos';
import { formatKg, formatFecha } from '@/utils/calculadora';
import AnimalWeightChart from '@/components/svg/AnimalWeightChart';
import RegistrarPesoModal from '@/components/RegistrarPesoModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  animal: Animal;
  lote: Lote;
  pesoPromedioLote: number;
  onClose: () => void;
}

export default function AnimalPesoModal({ animal, lote, pesoPromedioLote, onClose }: Props) {
  const { pesos, loading } = usePesos(animal.id);
  const [showRegistrar, setShowRegistrar] = useState(false);

  // pesos from hook come desc — reverse for chart (needs asc)
  const pesosAsc = [...pesos].reverse();

  // ── Stat calculations ──────────────────────────────────────────────────────
  const pesoActual = animal.pesoActual;
  const pesoInicial = animal.pesoInicial;
  const kgGanados = pesoActual - pesoInicial;

  const kgPorDia = (() => {
    if (pesosAsc.length < 2) return null;
    const first = pesosAsc[0];
    const last = pesosAsc[pesosAsc.length - 1];
    const dias = Math.max(
      1,
      Math.round(
        (new Date(last.fecha).getTime() - new Date(first.fecha).getTime()) /
          86_400_000
      )
    );
    return (last.peso - first.peso) / dias;
  })();

  const vsPromedio = pesoActual - pesoPromedioLote;

  // ── Historial rows ─────────────────────────────────────────────────────────
  const historial = pesos.map((p, i) => {
    const prev = pesos[i + 1];
    const delta = prev ? p.peso - prev.peso : null;
    return { ...p, delta };
  });
  const tieneNotas = historial.some((h) => h.notas);

  if (showRegistrar) {
    return (
      <RegistrarPesoModal
        fincaId={lote.fincaId}
        animal={animal}
        loteId={lote.id}
        onClose={() => setShowRegistrar(false)}
      />
    );
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {animal.numeroArete} — {animal.raza}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Lote {lote.nombreLote}</p>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center min-h-[120px]">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : pesos.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <p className="text-muted-foreground text-sm">Este animal aún no tiene pesajes registrados.</p>
            <Button onClick={() => setShowRegistrar(true)}>+ Registrar primer peso</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* ── Stat cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Peso actual', value: formatKg(pesoActual), color: '' },
                { label: 'Total ganado', value: `${kgGanados >= 0 ? '+' : ''}${formatKg(kgGanados)}`, color: kgGanados >= 0 ? 'text-success' : 'text-destructive' },
                { label: 'kg/día', value: kgPorDia !== null ? kgPorDia.toFixed(2) : '—', color: '' },
                { label: 'vs. prom. lote', value: `${vsPromedio >= 0 ? '+' : ''}${formatKg(vsPromedio)}`, color: vsPromedio >= 0 ? 'text-success' : 'text-destructive' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg border border-border p-3 text-center">
                  <div className={`font-bold text-lg ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* ── Chart ── */}
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Evolución de peso</span>
                <span className="text-xs text-muted-foreground">
                  {pesos.length} pesaje{pesos.length !== 1 ? 's' : ''}
                </span>
              </div>
              <AnimalWeightChart pesos={pesosAsc} pesoPromedioLote={pesoPromedioLote} />
            </div>

            {/* ── Historial ── */}
            <div>
              <p className="text-sm font-medium mb-2">Historial</p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Fecha</th>
                      <th className="px-3 py-2 text-left">Peso</th>
                      <th className="px-3 py-2 text-left">Delta</th>
                      {tieneNotas && <th className="px-3 py-2 text-left">Notas</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))]">
                    {historial.map((h) => (
                      <tr key={h.id}>
                        <td className="px-3 py-2">{formatFecha(h.fecha)}</td>
                        <td className="px-3 py-2"><strong>{formatKg(h.peso)}</strong></td>
                        <td className="px-3 py-2">
                          {h.delta !== null ? (
                            <span className={h.delta >= 0 ? 'text-success' : 'text-destructive'}>
                              {h.delta >= 0 ? '+' : ''}{formatKg(h.delta)}
                            </span>
                          ) : '—'}
                        </td>
                        {tieneNotas && (
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {h.notas || '—'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Registrar peso button ── */}
            {animal.estado === 'activo' && (
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setShowRegistrar(true)}>+ Registrar peso</Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
