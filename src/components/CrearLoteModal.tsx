import { useState, FormEvent } from 'react';
import { useCrearLote, useActualizarLote } from '@/hooks/useLotes';
import { Lote } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  fincaId: string;
  onClose: () => void;
  editData?: Lote;
}

export default function CrearLoteModal({ fincaId, onClose, editData }: Props) {
  const { crearLote } = useCrearLote();
  const { actualizarLote } = useActualizarLote();
  const isEdit = !!editData;

  const [nombre, setNombre] = useState(editData?.nombreLote ?? '');
  const [fechaCompra, setFechaCompra] = useState(
    editData?.fechaCompra ?? new Date().toISOString().split('T')[0]
  );
  const [tipo, setTipo] = useState<'propio' | 'medias'>(editData?.tipoPropiedad ?? 'propio');
  const [socioNombre, setSocioNombre] = useState(editData?.socio?.nombre ?? '');
  const [socioPorcentaje, setSocioPorcentaje] = useState(editData?.socio?.porcentaje ?? 50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!nombre.trim()) { setError('El nombre del lote es requerido'); return; }
    if (tipo === 'medias' && !socioNombre.trim()) { setError('El nombre del socio es requerido'); return; }
    setLoading(true);
    try {
      if (isEdit && editData) {
        await actualizarLote(editData.id, {
          nombreLote: nombre.trim(),
          tipoPropiedad: tipo,
          socio: tipo === 'medias' ? { nombre: socioNombre.trim(), porcentaje: socioPorcentaje } : null,
        });
      } else {
        await crearLote({
          fincaId,
          nombreLote: nombre.trim(),
          fechaCompra,
          tipoPropiedad: tipo,
          socio: tipo === 'medias' ? { nombre: socioNombre.trim(), porcentaje: socioPorcentaje } : undefined,
        });
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
          <DialogTitle>{isEdit ? 'Editar Lote' : 'Nuevo Lote'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nombre del lote *</Label>
            <Input placeholder="Ej: Lote Enero 2026" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>

          {!isEdit && (
            <div className="space-y-1.5">
              <Label>Fecha de compra</Label>
              <Input type="date" value={fechaCompra} onChange={(e) => setFechaCompra(e.target.value)} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Tipo de propiedad</Label>
            <select
              className="w-full border border-[hsl(var(--border))] rounded-md px-3 py-2 text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as 'propio' | 'medias')}
            >
              <option value="propio">100% Propio</option>
              <option value="medias">A medias con socio</option>
            </select>
          </div>

          {tipo === 'medias' && (
            <>
              <div className="space-y-1.5">
                <Label>Nombre del socio *</Label>
                <Input placeholder="Ej: Juan Pérez" value={socioNombre} onChange={(e) => setSocioNombre(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Porcentaje del socio: {socioPorcentaje}% / {100 - socioPorcentaje}% tuyo</Label>
                <input
                  type="range"
                  min={10}
                  max={90}
                  step={5}
                  value={socioPorcentaje}
                  onChange={(e) => setSocioPorcentaje(Number(e.target.value))}
                  className="w-full accent-[hsl(var(--primary))]"
                />
              </div>
            </>
          )}

          {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear Lote'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
