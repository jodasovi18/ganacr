import { useState, FormEvent } from 'react';
import { useAgregarAnimal, useEditarAnimal } from '@/hooks/useAnimales';
import { Animal } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  fincaId: string;
  loteId: string;
  onClose: () => void;
  editData?: Animal;
}

export default function AgregarAnimalModal({ fincaId, loteId, onClose, editData }: Props) {
  const { agregarAnimal } = useAgregarAnimal();
  const { editarAnimal } = useEditarAnimal();
  const isEdit = !!editData;

  const [numeroArete, setNumeroArete] = useState(editData?.numeroArete ?? '');
  const [raza, setRaza] = useState(editData?.raza ?? '');
  const [origen, setOrigen] = useState<'comprado' | 'nacido_finca' | 'sin_registro'>(
    editData?.origen ?? 'comprado'
  );
  const [numeroSubasta, setNumeroSubasta] = useState(editData?.numeroSubasta ?? '');
  const [pesoInicial, setPesoInicial] = useState(editData?.pesoInicial?.toString() ?? '');
  const [precioCompra, setPrecioCompra] = useState(editData?.precioCompra?.toString() ?? '');
  const [fechaIngreso, setFechaIngreso] = useState(
    editData?.fechaIngreso ?? new Date().toISOString().split('T')[0]
  );
  const [notas, setNotas] = useState(editData?.notas ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!numeroArete.trim() || !raza.trim() || !pesoInicial) {
      setError('Arete, raza y peso inicial son requeridos');
      return;
    }
    setLoading(true);
    try {
      if (isEdit && editData) {
        await editarAnimal(editData.id, loteId, editData.precioCompra, {
          raza: raza.trim(),
          numeroSubasta: origen === 'comprado' ? numeroSubasta.trim() : '',
          pesoInicial: Number(pesoInicial),
          precioCompra: precioCompra ? Number(precioCompra) : 0,
          fechaIngreso,
          notas: notas.trim(),
          origen,
        });
      } else {
        await agregarAnimal({
          fincaId,
          loteId,
          numeroArete: numeroArete.trim().toUpperCase(),
          raza: raza.trim(),
          numeroSubasta: origen === 'comprado' ? numeroSubasta.trim() : '',
          pesoInicial: Number(pesoInicial),
          precioCompra: precioCompra ? Number(precioCompra) : 0,
          fechaIngreso,
          notas,
          origen,
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
          <DialogTitle>{isEdit ? 'Editar Animal' : 'Agregar Animal'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Número de arete *</Label>
              <Input
                placeholder="Ej: CR-001234"
                value={numeroArete}
                onChange={(e) => setNumeroArete(e.target.value)}
                required
                disabled={isEdit}
                className={isEdit ? 'opacity-60 cursor-not-allowed' : ''}
              />
            </div>
            {origen === 'comprado' && (
              <div className="space-y-1.5">
                <Label>N° subasta</Label>
                <Input placeholder="Ej: 45" value={numeroSubasta} onChange={(e) => setNumeroSubasta(e.target.value)} />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Raza *</Label>
            <select
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground"
              value={raza}
              onChange={(e) => setRaza(e.target.value)}
              required
            >
              <option value="">Seleccionar raza...</option>
              <option>Brahman</option>
              <option>Holstein</option>
              <option>Jersey</option>
              <option>Pardo Suizo</option>
              <option>Nelore</option>
              <option>Charolais</option>
              <option>Angus</option>
              <option>Simmental</option>
              <option>Criollo</option>
              <option>Mestizo</option>
              <option>Otra</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Origen *</Label>
            <select
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground"
              value={origen}
              onChange={(e) => setOrigen(e.target.value as 'comprado' | 'nacido_finca' | 'sin_registro')}
            >
              <option value="comprado">Comprado (subasta u otra compra)</option>
              <option value="nacido_finca">Nacido en la finca</option>
              <option value="sin_registro">Sin registro de compra</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Peso inicial (kg) *</Label>
              <Input type="number" min="1" step="0.5" placeholder="Ej: 320" value={pesoInicial} onChange={(e) => setPesoInicial(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>{origen === 'comprado' ? 'Precio de compra (₡)' : 'Valor estimado (₡)'}</Label>
              <Input type="number" min="0" step="any" placeholder={origen === 'comprado' ? 'Ej: 450000' : 'Opcional'} value={precioCompra} onChange={(e) => setPrecioCompra(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Fecha de ingreso</Label>
            <Input type="date" value={fechaIngreso} onChange={(e) => setFechaIngreso(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Notas</Label>
            <textarea
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground resize-none"
              rows={2}
              placeholder="Observaciones del animal..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Agregar Animal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
