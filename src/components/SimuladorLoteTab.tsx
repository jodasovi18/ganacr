import { useMemo, useState } from 'react';
import { Lote, Animal, Venta } from '@/types';
import { simularVenta } from '@/utils/simulador';
import { precioRefPorDefecto } from '@/utils/finanzas';
import { formatColones, formatKg } from '@/utils/calculadora';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface Props { lote: Lote; animales: Animal[]; ventas: Venta[]; }

const diasDesde = (iso: string) =>
  Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));

export default function SimuladorLoteTab({ lote, animales, ventas }: Props) {
  const activos = useMemo(() => animales.filter((a) => a.estado === 'activo'), [animales]);
  const pesoActivos = useMemo(() => activos.reduce((s, a) => s + a.pesoActual, 0), [activos]);
  const gananciaDefault = useMemo(
    () => activos.reduce((s, a) => s + Math.max(0, (a.pesoActual - a.pesoInicial) / diasDesde(a.fechaIngreso)), 0),
    [activos],
  );
  const precioDefault = useMemo(
    () => lote.precioReferenciaKg ?? precioRefPorDefecto(ventas),
    [lote.precioReferenciaKg, ventas],
  );
  const costoDefault = useMemo(
    () => lote.totalGastos / diasDesde(lote.fechaCompra),
    [lote.totalGastos, lote.fechaCompra],
  );

  const [dias, setDias] = useState('30');
  const [precio, setPrecio] = useState(String(Math.round(precioDefault)));
  const [ganancia, setGanancia] = useState(gananciaDefault.toFixed(1));
  const [costo, setCosto] = useState(String(Math.round(costoDefault)));

  const sim = useMemo(
    () => simularVenta(pesoActivos, Number(ganancia) || 0, Number(precio) || 0, Number(costo) || 0, Number(dias) || 0),
    [pesoActivos, ganancia, precio, costo, dias],
  );

  if (pesoActivos === 0) {
    return <p className="text-sm text-muted-foreground py-6">No hay animales activos para simular.</p>;
  }

  const field = (id: string, label: string, value: string, onChange: (v: string) => void, suffix?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <div className="flex items-center gap-1">
        <Input id={id} type="number" min="0" className="w-28" value={value} onChange={(e) => onChange(e.target.value)} />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );

  const card = (label: string, value: string) => (
    <Card><CardContent className="p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </CardContent></Card>
  );

  return (
    <div className="space-y-4 py-3">
      <div className="flex flex-wrap gap-3">
        {field('sim-dias', 'Días', dias, setDias, 'días')}
        {field('sim-precio', '₡/kg', precio, setPrecio)}
        {field('sim-ganancia', 'Ganancia diaria', ganancia, setGanancia, 'kg/día')}
        {field('sim-costo', 'Costo diario', costo, setCosto, '₡/día')}
      </div>

      <Card><CardContent className="p-3">
        {sim.convieneEsperar ? (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            🟢 Conviene esperar (+{formatColones(sim.valorMarginalDiario)}/día)
          </Badge>
        ) : (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200">
            🟡 Conviene vender ahora ({formatColones(sim.valorMarginalDiario)}/día)
          </Badge>
        )}
        <p className="mt-2 text-sm">
          Esperar <strong>{Number(dias) || 0}</strong> días:{' '}
          <strong className={sim.gananciaEsperar >= 0 ? 'text-success' : 'text-destructive'}>
            {sim.gananciaEsperar >= 0 ? '+' : ''}{formatColones(sim.gananciaEsperar)}
          </strong>{' '}vs. vender hoy.
        </p>
      </CardContent></Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {card('Ingreso hoy', formatColones(sim.ingresoHoy))}
        {card(`Ingreso en ${Number(dias) || 0} días`, formatColones(sim.ingresoFuturo))}
        {card('Costo de mantener', formatColones(sim.costoMantener))}
        {card('Peso futuro', formatKg(sim.pesoFuturo))}
      </div>

      <div>
        <h3 className="font-semibold text-sm mb-2">Ganancia de esperar por horizonte</h3>
        <div className="rounded-lg border border-border divide-y divide-border">
          {[30, 60, 90].map((d) => {
            const s = simularVenta(pesoActivos, Number(ganancia) || 0, Number(precio) || 0, Number(costo) || 0, d);
            return (
              <div key={d} className="flex justify-between px-3 py-1.5 text-sm">
                <span>{d} días</span>
                <span className={s.gananciaEsperar >= 0 ? 'text-success' : 'text-destructive'}>
                  {s.gananciaEsperar >= 0 ? '+' : ''}{formatColones(s.gananciaEsperar)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
