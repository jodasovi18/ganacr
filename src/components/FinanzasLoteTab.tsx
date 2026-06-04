import { useMemo, useState, useEffect } from 'react';
import { Lote, Animal, Venta } from '@/types';
import { calcularFinanzasLote, precioRefPorDefecto } from '@/utils/finanzas';
import { useActualizarLote } from '@/hooks/useLotes';
import { formatColones, formatKg } from '@/utils/calculadora';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface Props { lote: Lote; animales: Animal[]; ventas: Venta[]; }

export default function FinanzasLoteTab({ lote, animales, ventas }: Props) {
  const { actualizarLote } = useActualizarLote();
  const refDefault = useMemo(
    () => lote.precioReferenciaKg ?? precioRefPorDefecto(ventas),
    [lote.precioReferenciaKg, ventas],
  );
  const [precioRef, setPrecioRef] = useState<string>(String(Math.round(refDefault)));
  const [guardando, setGuardando] = useState(false);
  useEffect(() => { setPrecioRef(String(Math.round(refDefault))); }, [refDefault]);

  const fin = useMemo(
    () => calcularFinanzasLote(lote, animales, ventas, Number(precioRef) || 0),
    [lote, animales, ventas, precioRef],
  );

  async function guardarRef() {
    setGuardando(true);
    try { await actualizarLote(lote.id, { precioReferenciaKg: Number(precioRef) || 0 }); }
    finally { setGuardando(false); }
  }

  const card = (label: string, value: string, hint?: string) => (
    <Card><CardContent className="p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </CardContent></Card>
  );

  return (
    <div className="space-y-4 py-3">
      {/* Precio de referencia */}
      <div className="flex items-end gap-2 flex-wrap">
        <div className="space-y-1.5">
          <Label htmlFor="precio-ref" className="text-xs">Precio ₡/kg de referencia (inventario en pie)</Label>
          <Input id="precio-ref" type="number" min="0" className="w-40"
            value={precioRef} onChange={(e) => setPrecioRef(e.target.value)} />
        </div>
        <Button size="sm" variant="outline" onClick={guardarRef} disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {card('Resultado estimado', formatColones(fin.resultadoEstimado), 'ventas + inventario − inversión − gastos')}
        {card('Rentabilidad (ROI)', `${fin.roi.toFixed(1)}%`)}
        {card('Valor inventario en pie', formatColones(fin.valorInventario))}
        {card('Costo de engorde / kg', formatColones(fin.costoEngordeKg))}
        {card('Costo total / kg', formatColones(fin.costoTotalKg))}
        {card('Kg producidos', formatKg(fin.kgProducidos))}
      </div>

      {lote.tipoPropiedad === 'medias' && lote.socio && (
        <Card><CardContent className="p-3 text-sm">
          Reparto del resultado — Vos: <strong>{formatColones(fin.resultadoPropietario ?? 0)}</strong>
          {' · '}{lote.socio.nombre}: <strong>{formatColones(fin.resultadoSocio ?? 0)}</strong>
        </CardContent></Card>
      )}

      <div>
        <h3 className="font-semibold text-sm mb-2">
          Margen por animal vendido (promedio {formatColones(fin.margenPromedioVendido)})
        </h3>
        {fin.margenPorAnimal.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin ventas registradas.</p>
        ) : (
          <div className="rounded-lg border border-border divide-y divide-border">
            {fin.margenPorAnimal.map((m) => (
              <div key={m.numeroArete} className="flex justify-between px-3 py-1.5 text-sm">
                <span>{m.numeroArete}</span>
                <span className={m.margen >= 0 ? 'text-success' : 'text-destructive'}>{formatColones(m.margen)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
