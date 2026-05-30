import { useState } from 'react';
import { useMoverAnimales } from '@/hooks/useMoverAnimales';
import { Animal, Finca, Lote } from '@/types';
import { formatColones, formatKg } from '@/utils/calculadora';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  animales: Animal[];
  loteSrc: Lote;
  todosLosLotes: Lote[];
  fincas: Finca[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function MoverAnimalesModal({
  animales, loteSrc, todosLosLotes, fincas, onClose, onSuccess,
}: Props) {
  const { moverAnimales } = useMoverAnimales();
  const [loteDstId, setLoteDstId] = useState('');
  const [precioKg, setPrecioKg] = useState('');
  const [showOtrasFincas, setShowOtrasFincas] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loteDst = todosLosLotes.find((l) => l.id === loteDstId) ?? null;

  const lotesMismaFinca = todosLosLotes.filter(
    (l) => l.fincaId === loteSrc.fincaId && l.id !== loteSrc.id
  );
  const lotesOtrasFincas = todosLosLotes.filter(
    (l) => l.fincaId !== loteSrc.fincaId
  );

  const fincaMap = new Map(fincas.map((f) => [f.id, f.nombre]));

  const pesoTotal = animales.reduce((s, a) => s + a.pesoActual, 0);
  const precioKgNum = Number(precioKg);
  const totalEstimado = precioKgNum > 0 ? Math.round(precioKgNum * pesoTotal) : 0;

  const canSubmit = loteDstId !== '' && precioKgNum > 0 && !saving;
  const n = animales.length;

  const lotesPorFinca = new Map<string, Lote[]>();
  for (const l of lotesOtrasFincas) {
    if (!lotesPorFinca.has(l.fincaId)) lotesPorFinca.set(l.fincaId, []);
    lotesPorFinca.get(l.fincaId)!.push(l);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!loteDst || !canSubmit) return;
    setError('');
    setSaving(true);
    try {
      await moverAnimales({ animales, loteSrc, loteDst, precioKg: precioKgNum });
      onClose();
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al mover los animales';
      if (msg.includes('pesos') || msg.includes('Phase 2')) {
        setError('Los animales fueron movidos, pero el historial de pesajes puede tardar en actualizarse. Cerrá y revisá el lote destino.');
      } else {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mover {n === 1 ? '1 animal' : `${n} animales`}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ── Destino ── */}
          <div className="space-y-2">
            <Label>Destino</Label>

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {fincaMap.get(loteSrc.fincaId) ?? 'Esta finca'}
            </p>

            {lotesMismaFinca.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay otros lotes en esta finca</p>
            ) : (
              <div className="space-y-1">
                {lotesMismaFinca.map((l) => (
                  <label
                    key={l.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      loteDstId === l.id
                        ? 'border-primary bg-[hsl(var(--primary)/.08)]'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    <input
                      type="radio"
                      name="loteDst"
                      value={l.id}
                      checked={loteDstId === l.id}
                      onChange={() => setLoteDstId(l.id)}
                      className="accent-primary"
                    />
                    <span className="flex-1 text-sm font-medium">{l.nombreLote}</span>
                    <span className="text-xs text-muted-foreground">{l.animalesActivos} activos</span>
                  </label>
                ))}
              </div>
            )}

            {lotesOtrasFincas.length > 0 && (
              <>
                <button
                  type="button"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                  onClick={() => setShowOtrasFincas((v) => !v)}
                >
                  Otras fincas {showOtrasFincas ? '▲' : '▼'}
                </button>

                {showOtrasFincas && [...lotesPorFinca.entries()].map(([fId, lts]) => (
                  <div key={fId} className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {fincaMap.get(fId) ?? fId}
                    </p>
                    {lts.map((l) => (
                      <label
                        key={l.id}
                        className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                          loteDstId === l.id
                            ? 'border-primary bg-[hsl(var(--primary)/.08)]'
                            : 'border-border hover:bg-muted'
                        }`}
                      >
                        <input
                          type="radio"
                          name="loteDst"
                          value={l.id}
                          checked={loteDstId === l.id}
                          onChange={() => setLoteDstId(l.id)}
                          className="accent-primary"
                        />
                        <span className="flex-1 text-sm font-medium">{l.nombreLote}</span>
                        <span className="text-xs text-muted-foreground">{l.animalesActivos} activos</span>
                      </label>
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>

          {/* ── Precio de traspaso ── */}
          <div className="space-y-1.5">
            <Label>Precio de traspaso</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">₡</span>
              <Input
                type="number"
                min={1}
                step={1}
                placeholder="0"
                value={precioKg}
                onChange={(e) => setPrecioKg(e.target.value)}
                required
                autoFocus={lotesMismaFinca.length === 0}
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">/ kg</span>
            </div>
            {precioKgNum > 0 && (
              <p className="text-xs text-muted-foreground">
                Total estimado: {formatColones(totalEstimado)} · {n} animal{n !== 1 ? 'es' : ''} · {formatKg(pesoTotal)} totales
              </p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={!canSubmit}>
              {saving ? 'Moviendo...' : `Mover ${n === 1 ? 'animal' : `${n} animales`}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
