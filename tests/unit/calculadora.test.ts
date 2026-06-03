import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularVenta } from '../../src/utils/calculadora';

test('calcularVenta a-medias 50/50 reparte la utilidad', () => {
  const r = calcularVenta(
    [{ animalId: 'a', numeroArete: 'A', pesoFinal: 400, precioVenta: 600000, precioCompra: 400000 }],
    { tipoPropiedad: 'medias', socio: { nombre: 'X', porcentaje: 50 } } as any,
    [{ monto: 100000 } as any],
    4,
  );
  assert.equal(r.totalInversion, 400000);
  assert.equal(r.gastosProporcion, 25000);      // 100000/4 * 1
  assert.equal(r.totalVenta, 600000);
  assert.equal(r.utilidadBruta, 175000);         // 600000-400000-25000
  assert.equal(r.utilidadSocio, 87500);
  assert.equal(r.utilidadPropietario, 87500);
});

test('calcularVenta propio no reparte', () => {
  const r = calcularVenta(
    [{ animalId: 'a', numeroArete: 'A', pesoFinal: 400, precioVenta: 500000, precioCompra: 400000 }],
    { tipoPropiedad: 'propio', socio: null } as any,
    [],
    2,
  );
  assert.equal(r.utilidadBruta, 100000);
  assert.equal(r.utilidadSocio, undefined);
});
