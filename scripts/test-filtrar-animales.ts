/* Test ejecutable de filtrarAnimales. Uso: npx tsx scripts/test-filtrar-animales.ts */
import { filtrarAnimales, contarFiltrosActivos, FILTRO_VACIO, FiltroAnimales } from '../src/utils/filtrarAnimales';

type A = Parameters<typeof filtrarAnimales>[0][number];

function animal(p: Partial<A>): A {
  return {
    id: p.id ?? 'x', userId: 'u', fincaId: 'f', loteId: 'l',
    numeroArete: p.numeroArete ?? 'A1', raza: p.raza ?? 'Nelore',
    pesoInicial: p.pesoInicial ?? 300, pesoActual: p.pesoActual ?? 400,
    precioCompra: p.precioCompra ?? 0, estado: p.estado ?? 'activo',
    fechaIngreso: '2026-01-01', createdAt: '2026-01-01', updatedAt: '2026-01-01',
    origen: p.origen,
    areteSenasa: p.areteSenasa,
  } as A;
}

let fails = 0;
function eq(name: string, got: unknown, exp: unknown) {
  const g = JSON.stringify(got), e = JSON.stringify(exp);
  if (g !== e) { console.error(`FAIL ${name}: got ${g}, exp ${e}`); fails++; }
  else { console.log(`ok ${name}`); }
}

const data: A[] = [
  animal({ id: '1', estado: 'activo', raza: 'Nelore', origen: 'comprado', pesoInicial: 300, pesoActual: 450, areteSenasa: 'CR188-001' }),
  animal({ id: '2', estado: 'vendido', raza: 'Brahman', origen: 'nacido_finca', pesoInicial: 300, pesoActual: 320 }),
  animal({ id: '3', estado: 'muerto', raza: 'Nelore', origen: undefined, pesoInicial: 200, pesoActual: 260 }),
];

eq('vacio', filtrarAnimales(data, FILTRO_VACIO).map(a => a.id), ['1', '2', '3']);
eq('estado', filtrarAnimales(data, { ...FILTRO_VACIO, estados: ['activo', 'muerto'] }).map(a => a.id), ['1', '3']);
eq('raza', filtrarAnimales(data, { ...FILTRO_VACIO, raza: 'Nelore' }).map(a => a.id), ['1', '3']);
eq('origen-comprado', filtrarAnimales(data, { ...FILTRO_VACIO, origen: 'comprado' }).map(a => a.id), ['1', '3']);
eq('origen-nacido', filtrarAnimales(data, { ...FILTRO_VACIO, origen: 'nacido_finca' }).map(a => a.id), ['2']);
eq('peso', filtrarAnimales(data, { ...FILTRO_VACIO, pesoMin: 400 }).map(a => a.id), ['1']);
eq('ganancia', filtrarAnimales(data, { ...FILTRO_VACIO, gananciaMin: 50, gananciaMax: 100 }).map(a => a.id), ['3']);
eq('combo', filtrarAnimales(data, { ...FILTRO_VACIO, estados: ['activo'], raza: 'Nelore', pesoMin: 400 }).map(a => a.id), ['1']);
eq('contar-0', contarFiltrosActivos(FILTRO_VACIO), 0);
eq('contar-3', contarFiltrosActivos({ ...FILTRO_VACIO, estados: ['activo'], raza: 'Nelore', pesoMin: 400 }), 3);

eq('sin-arete', filtrarAnimales(data, { ...FILTRO_VACIO, sinAreteSenasa: true }).map(a => a.id), ['2', '3']);
eq('contar-sin-arete', contarFiltrosActivos({ ...FILTRO_VACIO, sinAreteSenasa: true }), 1);

if (fails > 0) { console.error(`\n${fails} test(s) FAILED`); process.exit(1); }
console.log('\nTODOS OK'); process.exit(0);
