import { useState, FormEvent } from 'react';
import { useAgregarGastoFinca } from '@/hooks/useGastosFinca';
import { formatColones } from '@/utils/calculadora';
import { Lote, TipoGasto } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  fincaId: string;
  lotes: Lote[];
  onClose: () => void;
}

const TIPOS: { value: TipoGasto; label: string }[] = [
  { value: 'alimento',    label: '🌾 Alimento' },
  { value: 'veterinario', label: '💉 Veterinario' },
  { value: 'mano_de_obra',label: '👷 Mano de obra' },
  { value: 'transporte',  label: '🚛 Transporte' },
  { value: 'otro',        label: '📋 Otro' },
];

export default function GastoFincaModal({ fincaId, lotes, onClose }: Props) {
  const { agregarGastoFinca } = useAgregarGastoFinca();

  const [concepto, setConcepto]   = useState('');
  const [tipo, setTipo]           = useState<TipoGasto>('otro');
  const [montoRaw, setMontoRaw]   = useState('');
  const [fecha, setFecha]         = useState(new Date().toISOString().split('T')[0]);
  const [quienPago, setQuienPago] = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  // Default: lotes propios con activos > 0 → checked; lotes a medias → unchecked
  const [seleccionados, setSeleccionados] = useState<Set<string>>(
    () => new Set(
      lotes
        .filter((l) => l.tipoPropiedad === 'propio' && l.animalesActivos > 0)
        .map((l) => l.id)
    )
  );

  const monto = parseFloat(montoRaw) || 0;
  const lotesEnDistribucion = lotes.filter(
    (l) => seleccionados.has(l.id) && l.animalesActivos > 0
  );
  const totalActivos = lotesEnDistribucion.reduce((s, l) => s + l.animalesActivos, 0);

  function montoPara(lote: Lote): number | null {
    if (monto <= 0 || totalActivos === 0 || !seleccionados.has(lote.id)) return null;
    return Math.round(monto * lote.animalesActivos / totalActivos);
  }

  function toggleLote(loteId: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(loteId)) next.delete(loteId); else next.add(loteId);
      return next;
    });
  }

  const canSubmit = concepto.trim().length > 0 && monto > 0 && lotesEnDistribucion.length > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    try {
      await agregarGastoFinca({
        fincaId,
        concepto: concepto.trim(),
        tipo,
        montoTotal: monto,
        fecha,
        quienPago: quienPago.trim() || undefined,
        lotesSeleccionados: lotesEnDistribucion.map((l) => ({
          loteId: l.id,
          nombreLote: l.nombreLote,
          animalesActivos: l.animalesActivos,
        })),
      });
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Error al registrar gasto');
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>💸 Nuevo gasto de finca</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">

          <div className="space-y-1.5">
            <Label htmlFor="gf-concepto">Concepto *</Label>
            <Input
              id="gf-concepto"
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej: Vacunación masiva"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="gf-tipo">Tipo</Label>
              <select
                id="gf-tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoGasto)}
                className="w-full h-9 rounded-md border border-[hsl(var(--border))] bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
              >
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gf-monto">Monto total (₡) *</Label>
              <Input
                id="gf-monto"
                type="number"
                value={montoRaw}
                onChange={(e) => setMontoRaw(e.target.value)}
                placeholder="0"
                min="1"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="gf-fecha">Fecha *</Label>
              <Input
                id="gf-fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gf-quien">Quién pagó</Label>
              <Input
                id="gf-quien"
                type="text"
                value={quienPago}
                onChange={(e) => setQuienPago(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-[hsl(var(--foreground))] mb-2">Aplicar a lotes</p>
            {lotes.length === 0 ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Esta finca no tiene lotes. Creá un lote primero.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {lotes.map((lote) => {
                  const disabled   = lote.animalesActivos === 0;
                  const checked    = seleccionados.has(lote.id);
                  const esMedias   = lote.tipoPropiedad === 'medias';
                  const estimado   = montoPara(lote);
                  return (
                    <label
                      key={lote.id}
                      className={[
                        'flex items-center gap-2 px-3 py-2 rounded-md border text-sm cursor-pointer transition-colors',
                        checked && !disabled
                          ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]'
                          : 'border-[hsl(var(--border))]',
                        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[hsl(var(--muted))]',
                      ].filter(Boolean).join(' ')}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => { if (!disabled) toggleLote(lote.id); }}
                        className="accent-[hsl(var(--primary))]"
                      />
                      <span className="flex-1 truncate">
                        {esMedias && '🤝 '}
                        {lote.nombreLote}
                        {esMedias && (
                          <span className="text-[hsl(var(--muted-foreground))] text-xs ml-1">
                            (a medias — seleccioná explícitamente)
                          </span>
                        )}
                      </span>
                      <span className="text-[hsl(var(--muted-foreground))] text-xs shrink-0">
                        {disabled ? '0 act.' : `${lote.animalesActivos} act.`}
                      </span>
                      <span className="text-xs font-medium shrink-0 w-24 text-right">
                        {disabled || estimado === null ? '—' : `≈ ${formatColones(estimado)}`}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {lotesEnDistribucion.length > 0 && monto > 0 && (
            <div className="text-sm text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] rounded-md px-3 py-2">
              Total: <strong className="text-[hsl(var(--foreground))]">{formatColones(monto)}</strong>
              {' · '}{lotesEnDistribucion.length} lote{lotesEnDistribucion.length !== 1 ? 's' : ''}
              {' · '}{totalActivos} animales activos
            </div>
          )}

          {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit || loading}>
              {loading ? 'Registrando...' : 'Registrar gasto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
