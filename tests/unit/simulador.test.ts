import test from 'node:test';
import assert from 'node:assert/strict';
import { simularVenta } from '../../src/utils/simulador';

test('simularVenta — conviene esperar', () => {
  // pesoActivos 1000, ganancia 5 kg/día, ₡1000/kg, costo ₡3000/día, 30 días
  const s = simularVenta(1000, 5, 1000, 3000, 30);
  assert.equal(s.pesoFuturo, 1150);            // 1000 + 5*30
  assert.equal(s.ingresoHoy, 1_000_000);       // 1000*1000
  assert.equal(s.ingresoFuturo, 1_150_000);    // 1150*1000
  assert.equal(s.costoMantener, 90_000);       // 3000*30
  assert.equal(s.valorMarginalDiario, 2000);   // 5*1000 - 3000
  assert.equal(s.gananciaEsperar, 60_000);     // 1150000-90000-1000000 (= 30*2000)
  assert.equal(s.convieneEsperar, true);
});

test('simularVenta — conviene vender ahora', () => {
  const s = simularVenta(1000, 1, 1000, 3000, 30); // marginal = 1000-3000 = -2000
  assert.equal(s.valorMarginalDiario, -2000);
  assert.equal(s.gananciaEsperar, -60_000);
  assert.equal(s.convieneEsperar, false);
});

test('simularVenta — break-even (marginal 0)', () => {
  const s = simularVenta(1000, 3, 1000, 3000, 30); // 3*1000-3000 = 0
  assert.equal(s.valorMarginalDiario, 0);
  assert.equal(s.gananciaEsperar, 0);
  assert.equal(s.convieneEsperar, false);
});

test('simularVenta — dias 0 = igual a hoy', () => {
  const s = simularVenta(1000, 5, 1000, 3000, 0);
  assert.equal(s.pesoFuturo, 1000);
  assert.equal(s.ingresoFuturo, s.ingresoHoy);
  assert.equal(s.gananciaEsperar, 0);
});
