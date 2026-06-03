import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularFinanzasLote, precioRefPorDefecto } from '../../src/utils/finanzas';

const lote = (extra: any = {}) => ({
  id: 'L1', nombreLote: 'Lote 1', tipoPropiedad: 'propio', socio: null,
  totalInvertido: 1_000_000, totalGastos: 200_000, totalVentas: 700_000, ...extra,
} as any);

const animales = [
  { id: 'a1', estado: 'vendido', numeroArete: 'A1', pesoInicial: 300, pesoActual: 500, precioCompra: 400_000, fechaIngreso: '2026-01-01' },
  { id: 'a2', estado: 'activo',  numeroArete: 'A2', pesoInicial: 300, pesoActual: 400, precioCompra: 300_000, fechaIngreso: '2026-01-01' },
  { id: 'a3', estado: 'activo',  numeroArete: 'A3', pesoInicial: 300, pesoActual: 400, precioCompra: 300_000, fechaIngreso: '2026-01-01' },
] as any;

const ventas = [{
  id: 'v1', cantidadAnimales: 1, gastosProporcion: 50_000, totalVenta: 700_000,
  animales: [{ numeroArete: 'A1', pesoFinal: 500, precioVenta: 700_000, precioCompra: 400_000 }],
}] as any;

test('calcularFinanzasLote — métricas núcleo (propio)', () => {
  const f = calcularFinanzasLote(lote(), animales, ventas, 1000);
  assert.equal(f.kgProducidos, 400);              // 200+100+100
  assert.equal(f.costoEngordeKg, 500);            // 200000/400
  assert.equal(f.costoTotalKg, 3000);             // 1200000/400
  assert.equal(f.valorInventario, 800_000);       // (400+400)*1000
  assert.equal(f.resultadoEstimado, 300_000);     // (700000+800000)-(1000000+200000)
  assert.equal(f.roi, 25);                         // 300000/1200000*100
  assert.equal(f.margenPromedioVendido, 250_000); // 700000-400000-50000
  assert.equal(f.margenPorAnimal[0].numeroArete, 'A1');
});

test('calcularFinanzasLote — reparto a-medias 50/50', () => {
  const f = calcularFinanzasLote(
    lote({ tipoPropiedad: 'medias', socio: { nombre: 'X', porcentaje: 50 } }), animales, ventas, 1000);
  assert.equal(f.resultadoSocio, 150_000);
  assert.equal(f.resultadoPropietario, 150_000);
});

test('calcularFinanzasLote — sin kg producidos no divide por cero', () => {
  const sinKg = [{ id: 'a', estado: 'activo', numeroArete: 'A', pesoInicial: 300, pesoActual: 300, precioCompra: 0, fechaIngreso: '2026-01-01' }] as any;
  const f = calcularFinanzasLote(lote({ totalInvertido: 0, totalGastos: 0, totalVentas: 0 }), sinKg, [], 0);
  assert.equal(f.kgProducidos, 0);
  assert.equal(f.costoEngordeKg, 0);
  assert.equal(f.costoTotalKg, 0);
  assert.equal(f.roi, 0);
});

test('precioRefPorDefecto — promedio ₡/kg realizado', () => {
  assert.equal(precioRefPorDefecto(ventas), 1400); // 700000/500
  assert.equal(precioRefPorDefecto([]), 0);
});
