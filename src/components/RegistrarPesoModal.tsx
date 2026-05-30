import { useState, FormEvent } from 'react';
import { useRegistrarPeso } from '@/hooks/usePesos';
import { Animal } from '@/types';
import { formatKg } from '@/utils/calculadora';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props { fincaId: string; animal: Animal; loteId: string; onClose: () => void; }

export default function RegistrarPesoModal({ fincaId, animal, loteId, onClose }: Props) {
  const { registrarPeso } = useRegistrarPeso();
  const [peso, setPeso] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const gananciaPreview = peso ? Number(peso) - animal.pesoActual : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!peso || Number(peso) <= 0) { setError('Ingresá un peso válido'); return; }
    setLoading(true);
    try {
      await registrarPeso({ fincaId, animalId: animal.id, loteId, peso: Number(peso), fecha, notas });
      onClose();
    } catch (err) {
      setError('Error: ' + String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Peso</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3 text-sm space-y-1">
          <p><span className="text-[hsl(var(--muted-foreground))]">Arete:</span> <strong>{animal.numeroArete}</strong> — {animal.raza}</p>
          <p><span className="text-[hsl(var(--muted-foreground))]">Peso actual:</span> <strong>{formatKg(animal.pesoActual)}</strong></p>
          <p><span className="text-[hsl(var(--muted-foreground))]">Peso inicial:</span> <strong>{formatKg(animal.pesoInicial)}</strong></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nuevo peso (kg) *</Label>
              <Input type="number" min="1" step="0.5" placeholder="Ej: 350" value={peso} onChange={(e) => setPeso(e.target.value)} required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>

          {gananciaPreview !== null && (
            <div className={`rounded-lg border p-3 text-sm font-medium ${gananciaPreview >= 0 ? 'border-[hsl(var(--success))] text-[hsl(var(--success))]' : 'border-[hsl(var(--destructive))] text-[hsl(var(--destructive))]'}`}>
              Cambio: {gananciaPreview >= 0 ? '+' : ''}{formatKg(gananciaPreview)} respecto al peso actual
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Notas</Label>
            <textarea
              className="w-full border border-[hsl(var(--border))] rounded-md px-3 py-2 text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))] resize-none"
              rows={2}
              placeholder="Observaciones del pesaje..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Guardando...' : 'Registrar Peso'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
