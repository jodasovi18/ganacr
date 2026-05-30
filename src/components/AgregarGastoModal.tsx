import { useState, FormEvent } from 'react';
import { useAgregarGasto, useActualizarGasto } from '@/hooks/useGastos';
import { TipoGasto, Gasto } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  fincaId: string;
  loteId: string;
  onClose: () => void;
  editData?: Gasto;
}

const TIPOS: { value: TipoGasto; label: string }[] = [
  { value: 'alimento', label: '🌾 Alimento' },
  { value: 'veterinario', label: '💉 Veterinario' },
  { value: 'mano_de_obra', label: '👷 Mano de obra' },
  { value: 'transporte', label: '🚛 Transporte' },
  { value: 'otro', label: '📋 Otro' },
];

export default function AgregarGastoModal({ fincaId, loteId, onClose, editData }: Props) {
  const { agregarGasto } = useAgregarGasto();
  const { actualizarGasto } = useActualizarGasto();
  const isEdit = !!editData;

  const [concepto, setConcepto] = useState(editData?.concepto ?? '');
  const [tipo, setTipo] = useState<TipoGasto>(editData?.tipo ?? 'alimento');
  const [monto, setMonto] = useState(editData?.monto?.toString() ?? '');
  const [fecha, setFecha] = useState(editData?.fecha ?? new Date().toISOString().split('T')[0]);
  const [quienPago, setQuienPago] = useState(editData?.quienPago ?? '');
  const [notas, setNotas] = useState(editData?.notas ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!concepto.trim() || !monto || Number(monto) <= 0) { setError('Concepto y monto son requeridos'); return; }
    setLoading(true);
    try {
      if (isEdit && editData) {
        await actualizarGasto(editData.id, loteId, editData.monto, {
          concepto, tipo, monto: Number(monto), fecha, quienPago, notas,
        });
      } else {
        await agregarGasto({ fincaId, loteId, concepto, tipo, monto: Number(monto), fecha, quienPago, notas });
      }
      onClose();
    } catch (err) {
      setError('Error: ' + String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Gasto' : 'Registrar Gasto'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Tipo de gasto</Label>
            <select
              className="w-full border border-[hsl(var(--border))] rounded-md px-3 py-2 text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoGasto)}
            >
              {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Concepto *</Label>
            <Input placeholder="Ej: Sales minerales, Ivermectina, etc." value={concepto} onChange={(e) => setConcepto(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Monto (₡) *</Label>
              <Input type="number" min="1" step="any" placeholder="Ej: 25000" value={monto} onChange={(e) => setMonto(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Quién pagó (si es a medias)</Label>
            <Input placeholder="Ej: Juan, Yo, Ambos..." value={quienPago} onChange={(e) => setQuienPago(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Notas</Label>
            <textarea
              className="w-full border border-[hsl(var(--border))] rounded-md px-3 py-2 text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))] resize-none"
              rows={2}
              placeholder="Detalle adicional..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Registrar Gasto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
