import test from 'node:test';
import assert from 'node:assert/strict';
import { filtrarAnimales, contarFiltrosActivos, FILTRO_VACIO } from '../../src/utils/filtrarAnimales';

type A = Parameters<typeof filtrarAnimales>[0][number];
const animal = (p: Partial<A>): A => ({
  id: p.id ?? 'x', userId: 'u', fincaId: 'f', loteId: 'l',
  numeroArete: p.numeroArete ?? 'A1', raza: p.raza ?? 'Nelore',
  pesoInicial: p.pesoInicial ?? 300, pesoActual: p.pesoActual ?? 400,
  precioCompra: 0, estado: p.estado ?? 'activo',
  fechaIngreso: '2026-01-01', createdAt: '2026-01-01', updatedAt: '2026-01-01',
  origen: p.origen, areteSenasa: p.areteSenasa,
} as A);

const data: A[] = [
  animal({ id: '1', estado: 'activo', raza: 'Nelore', origen: 'comprado', pesoInicial: 300, pesoActual: 450, areteSenasa: 'CR188-001' }),
  animal({ id: '2', estado: 'vendido', raza: 'Brahman', origen: 'nacido_finca', pesoInicial: 300, pesoActual: 320 }),
  animal({ id: '3', estado: 'muerto', raza: 'Nelore', origen: undefined, pesoInicial: 200, pesoActual: 260 }),
];
const ids = (f: any) => filtrarAnimales(data, f).map((a) => a.id);

test('vacío devuelve todos', () => assert.deepEqual(ids(FILTRO_VACIO), ['1', '2', '3']));
test('estado', () => assert.deepEqual(ids({ ...FILTRO_VACIO, estados: ['activo', 'muerto'] }), ['1', '3']));
test('raza', () => assert.deepEqual(ids({ ...FILTRO_VACIO, raza: 'Nelore' }), ['1', '3']));
test('origen comprado (incluye undefined)', () => assert.deepEqual(ids({ ...FILTRO_VACIO, origen: 'comprado' }), ['1', '3']));
test('peso min', () => assert.deepEqual(ids({ ...FILTRO_VACIO, pesoMin: 400 }), ['1']));
test('ganancia rango', () => assert.deepEqual(ids({ ...FILTRO_VACIO, gananciaMin: 50, gananciaMax: 100 }), ['3']));
test('combo AND', () => assert.deepEqual(ids({ ...FILTRO_VACIO, estados: ['activo'], raza: 'Nelore', pesoMin: 400 }), ['1']));
test('contar 0', () => assert.equal(contarFiltrosActivos(FILTRO_VACIO), 0));
test('contar 3', () => assert.equal(contarFiltrosActivos({ ...FILTRO_VACIO, estados: ['activo'], raza: 'Nelore', pesoMin: 400 }), 3));
