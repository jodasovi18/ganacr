import { useState, FormEvent } from 'react';
import { useRegistrarVenta } from '@/hooks/useVentas';
import { Animal, Gasto, Lote, ItemVenta } from '@/types';
import { formatColones, calcularVenta } from '@/utils/calculadora';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  fincaId: string;
  lote: Lote;
  animalesActivos: Animal[];
  gastos: Gasto[];
  onClose: () => void;
}

export default function VenderAnimalesModal({ fincaId, lote, animalesActivos, gastos, onClose }: Props) {
  const { registrarVenta } = useRegistrarVenta();
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [precios, setPrecios] = useState<Record<string, string>>({});
  const [pesos, setPesos] = useState<Record<string, string>>({});
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function toggleAnimal(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const animalesVenta: ItemVenta[] = animalesActivos
    .filter((a) => seleccionados.has(a.id))
    .map((a) => ({
      animalId: a.id,
      numeroArete: a.numeroArete,
      pesoFinal: Number(pesos[a.id] || a.pesoActual),
      precioVenta: Number(precios[a.id] || 0),
      precioCompra: a.precioCompra,
    }));

  const preview = seleccionados.size > 0
    ? calcularVenta(animalesVenta, lote, gastos, lote.totalAnimales)
    : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (seleccionados.size === 0) { setError('Seleccioná al menos un animal'); return; }
    const sinPrecio = animalesVenta.some((a) => !a.precioVenta || a.precioVenta <= 0);
    if (sinPrecio) { setError('Todos los animales seleccionados deben tener precio de venta'); return; }
    setLoading(true);
    try {
      await registrarVenta({ fincaId, lote, animalesVendidos: animalesVenta, fecha, gastos, totalAnimalesEnLote: lote.totalAnimales, notas });
      onClose();
    } catch (err) {
      setError('Error: ' + String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vender Animales</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Fecha de venta</Label>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="max-w-xs" />
          </div>

          <p className="text-sm font-medium text-[hsl(var(--foreground))]">Seleccioná los animales a vender:</p>

          <div className="overflow-x-auto rounded-lg border border-[hsl(var(--border))]">
            <table className="w-full text-sm">
              <thead className="bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                <tr>
                  <th className="px-3 py-2 text-left"></th>
                  <th className="px-3 py-2 text-left">Arete</th>
                  <th className="px-3 py-2 text-left">Raza</th>
                  <th className="px-3 py-2 text-left">Peso actual</th>
                  <th className="px-3 py-2 text-left">Peso final (kg)</th>
                  <th className="px-3 py-2 text-left">Precio venta (₡)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {animalesActivos.map((animal) => {
                  const sel = seleccionados.has(animal.id);
                  return (
                    <tr key={animal.id} className={sel ? '' : 'opacity-50'}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={sel}
                          onChange={() => toggleAnimal(animal.id)}
                          className="accent-[hsl(var(--primary))] w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-2"><strong>{animal.numeroArete}</strong></td>
                      <td className="px-3 py-2">{animal.raza}</td>
                      <td className="px-3 py-2">{animal.pesoActual} kg</td>
                      <td className="px-3 py-2">
                        <Input
                          type="number" min="1" step="0.5"
                          placeholder={String(animal.pesoActual)}
                          value={pesos[animal.id] || ''}
                          onChange={(e) => setPesos((p) => ({ ...p, [animal.id]: e.target.value }))}
                          disabled={!sel}
                          className="w-24 h-7 px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number" min="1" step="any"
                          placeholder="0"
                          value={precios[animal.id] || ''}
                          onChange={(e) => setPrecios((p) => ({ ...p, [animal.id]: e.target.value }))}
                          disabled={!sel}
                          className="w-28 h-7 px-2 py-1"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {preview && seleccionados.size > 0 && (
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3">
              <p className="text-sm font-medium mb-2">Resumen de la venta ({seleccionados.size} animales)</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-[hsl(var(--muted-foreground))]">Inversión animales:</span>
                <span>{formatColones(preview.totalInversion)}</span>
                <span className="text-[hsl(var(--muted-foreground))]">Gastos proporcionales:</span>
                <span>{formatColones(preview.gastosProporcion)}</span>
                <span className="text-[hsl(var(--muted-foreground))]">Total venta:</span>
                <span>{formatColones(preview.totalVenta)}</span>
                <span className="text-[hsl(var(--muted-foreground))]">Utilidad bruta:</span>
                <span className={`font-semibold ${preview.utilidadBruta >= 0 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]'}`}>
                  {formatColones(preview.utilidadBruta)}
                </span>
                {preview.utilidadSocio !== undefined && lote.socio && (
                  <>
                    <span className="text-[hsl(var(--muted-foreground))]">Utilidad {lote.socio.nombre} ({lote.socio.porcentaje}%):</span>
                    <span className="text-[hsl(var(--success))]">{formatColones(preview.utilidadSocio)}</span>
                    <span className="text-[hsl(var(--muted-foreground))]">Tu utilidad ({100 - lote.socio.porcentaje}%):</span>
                    <span className="text-[hsl(var(--success))]">{formatColones(preview.utilidadPropietario ?? 0)}</span>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Notas</Label>
            <textarea
              className="w-full border border-[hsl(var(--border))] rounded-md px-3 py-2 text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))] resize-none"
              rows={2}
              placeholder="Observaciones de la venta..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={loading || seleccionados.size === 0}>
              {loading ? 'Procesando...' : `Registrar Venta (${seleccionados.size} animales)`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
