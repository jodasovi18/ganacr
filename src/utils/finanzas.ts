import { Lote, Animal, Venta } from '@/types';

export interface FinanzasLote {
  loteId: string;
  nombreLote: string;
  inversionTotal: number;
  gastosTotal: number;
  ventasTotal: number;
  kgProducidos: number;
  costoEngordeKg: number;
  costoTotalKg: number;
  precioRefKg: number;
  valorInventario: number;
  resultadoEstimado: number;
  roi: number;
  gananciaDiariaProm: number;
  resultadoSocio?: number;
  resultadoPropietario?: number;
  margenPorAnimal: { numeroArete: string; margen: number }[];
  margenPromedioVendido: number;
}

/** ₡/kg de referencia por defecto: promedio realizado (precioVenta/pesoFinal) de las ventas. */
export function precioRefPorDefecto(ventas: Venta[]): number {
  const ratios = ventas
    .flatMap((v) => v.animales)
    .filter((a) => a.pesoFinal > 0)
    .map((a) => a.precioVenta / a.pesoFinal);
  if (ratios.length === 0) return 0;
  return ratios.reduce((s, r) => s + r, 0) / ratios.length;
}

function diasDesde(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(1, Math.floor(ms / 86_400_000));
}

export function calcularFinanzasLote(
  lote: Lote, animales: Animal[], ventas: Venta[], precioRefKg: number,
): FinanzasLote {
  const inversionTotal = lote.totalInvertido;
  const gastosTotal = lote.totalGastos;
  const ventasTotal = lote.totalVentas;

  const productivos = animales.filter((a) => a.estado === 'activo' || a.estado === 'vendido');
  const kgProducidos = productivos.reduce((s, a) => s + Math.max(0, a.pesoActual - a.pesoInicial), 0);

  const costoEngordeKg = kgProducidos > 0 ? gastosTotal / kgProducidos : 0;
  const costoTotalKg = kgProducidos > 0 ? (inversionTotal + gastosTotal) / kgProducidos : 0;

  const activos = animales.filter((a) => a.estado === 'activo');
  const valorInventario = activos.reduce((s, a) => s + a.pesoActual * precioRefKg, 0);

  const resultadoEstimado = (ventasTotal + valorInventario) - (inversionTotal + gastosTotal);
  const baseCosto = inversionTotal + gastosTotal;
  const roi = baseCosto > 0 ? (resultadoEstimado / baseCosto) * 100 : 0;

  const gd = activos.map((a) => Math.max(0, a.pesoActual - a.pesoInicial) / diasDesde(a.fechaIngreso));
  const gananciaDiariaProm = gd.length > 0 ? gd.reduce((s, g) => s + g, 0) / gd.length : 0;

  const margenPorAnimal = ventas.flatMap((v) => {
    const gastoPorAnimal = v.cantidadAnimales > 0 ? v.gastosProporcion / v.cantidadAnimales : 0;
    return v.animales.map((a) => ({
      numeroArete: a.numeroArete,
      margen: a.precioVenta - a.precioCompra - gastoPorAnimal,
    }));
  });
  const margenPromedioVendido = margenPorAnimal.length > 0
    ? margenPorAnimal.reduce((s, m) => s + m.margen, 0) / margenPorAnimal.length : 0;

  const r: FinanzasLote = {
    loteId: lote.id, nombreLote: lote.nombreLote,
    inversionTotal, gastosTotal, ventasTotal, kgProducidos,
    costoEngordeKg, costoTotalKg, precioRefKg, valorInventario,
    resultadoEstimado, roi, gananciaDiariaProm, margenPorAnimal, margenPromedioVendido,
  };
  if (lote.tipoPropiedad === 'medias' && lote.socio) {
    r.resultadoSocio = resultadoEstimado * (lote.socio.porcentaje / 100);
    r.resultadoPropietario = resultadoEstimado - r.resultadoSocio;
  }
  return r;
}
